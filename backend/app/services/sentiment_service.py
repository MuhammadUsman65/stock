from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

_analyzer = SentimentIntensityAnalyzer()


async def analyze_sentiment(texts: list[str]) -> list[dict]:
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