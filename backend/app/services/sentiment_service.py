"""
Sentiment analysis using VADER (Valence Aware Dictionary and sEntiment
Reasoner) running fully locally.

Original plan was HuggingFace Inference API (FinBERT), but that requires
outbound HTTPS to api-inference.huggingface.co which is blocked on many
university/corporate networks. VADER is the practical alternative:
- Pure Python, no compiled backend, no external API calls
- Installs in seconds (vaderSentiment package, ~1MB)
- Works well on short texts like news headlines - exactly our use case
- Returns positive/negative/neutral scores in the same format FinBERT
  would have, so nothing else in the codebase needs to change

VADER vs FinBERT honestly: FinBERT is more accurate on financial text
because it was fine-tuned on financial news specifically. VADER is a
general-purpose sentiment lexicon. For a portfolio project displaying
headline sentiment as a visual indicator, VADER is more than good enough.
If you later move to a network/host where outbound HTTPS works freely,
swapping back to the HuggingFace API is a one-file change.
"""
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

_analyzer = SentimentIntensityAnalyzer()


async def analyze_sentiment(texts: list[str]) -> list[dict]:
    """
    Runs VADER on each text and returns sentiment scores.

    Kept async to match the original HuggingFace-based signature exactly,
    so the route file (app/api/sentiment.py) doesn't need any changes.
    VADER itself is synchronous and CPU-bound but fast enough (~0.1ms per
    headline) that blocking the event loop briefly is fine here.

    Returns a list of dicts, one per input text, each with:
        label: "positive" | "negative" | "neutral"
        score: float, confidence of the top label (0-1)
        scores: dict with all three raw scores
    """
    results = []
    for text in texts:
        vs = _analyzer.polarity_scores(text)
        # VADER's standard thresholds: compound >= 0.05 = positive,
        # compound <= -0.05 = negative, anything in between = neutral.
        compound = vs["compound"]
        if compound >= 0.05:
            label = "positive"
            score = round((compound + 1) / 2, 4)   # rescale -1..1 to 0..1
        elif compound <= -0.05:
            label = "negative"
            score = round((1 - compound) / 2, 4)
        else:
            label = "neutral"
            score = round(1 - abs(compound), 4)

        results.append({
            "label": label,
            "score": score,
            "scores": {
                "positive": round(vs["pos"], 4),
                "negative": round(vs["neg"], 4),
                "neutral": round(vs["neu"], 4),
            },
        })
    return results


def aggregate_sentiment(sentiments: list[dict]) -> dict:
    """
    Rolls up per-article sentiment into a single ticker-level summary.
    Weighted by each article's confidence score so a high-confidence
    positive counts more than a low-confidence one.
    """
    if not sentiments:
        return {
            "label": "neutral",
            "score": 0.0,
            "article_count": 0,
            "positive_count": 0,
            "negative_count": 0,
            "neutral_count": 0,
        }

    counts = {"positive": 0, "negative": 0, "neutral": 0}
    weighted_scores = {"positive": 0.0, "negative": 0.0, "neutral": 0.0}

    for s in sentiments:
        label = s["label"]
        counts[label] += 1
        weighted_scores[label] += s["score"]

    overall_label = max(weighted_scores, key=lambda k: weighted_scores[k])
    overall_score = round(weighted_scores[overall_label] / len(sentiments), 4)

    return {
        "label": overall_label,
        "score": overall_score,
        "article_count": len(sentiments),
        "positive_count": counts["positive"],
        "negative_count": counts["negative"],
        "neutral_count": counts["neutral"],
    }