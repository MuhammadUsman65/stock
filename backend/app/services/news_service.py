"""
News fetching via RSS feeds.

Uses Yahoo Finance and Google News RSS - both are free, require no API
key, and have no production-use restrictions unlike NewsAPI's free tier.
feedparser handles the parsing; it's already in requirements.txt.

One design note: we only send headlines (not full article text) to the
HuggingFace Inference API for sentiment analysis. Full text would cost
more API calls and isn't meaningfully more useful for FinBERT, which was
trained on financial news headlines and short summaries specifically.
"""
import time
from datetime import datetime, timezone

import feedparser
from cachetools import TTLCache

# Cache news results for 15 minutes - fresh enough to be useful,
# not so aggressive that we spam RSS endpoints on every request.
_cache: TTLCache = TTLCache(maxsize=128, ttl=900)

RSS_FEEDS = {
    "yahoo": "https://feeds.finance.yahoo.com/rss/2.0/headline?s={ticker}&region=US&lang=en-US",
    "google": "https://news.google.com/rss/search?q={ticker}+stock&hl=en-US&gl=US&ceid=US:en",
}

MAX_ARTICLES = 10


def fetch_news(ticker: str) -> list[dict]:
    """
    Returns up to MAX_ARTICLES recent news items for the ticker,
    each with title, url, source, and published_at fields.
    Tries Yahoo Finance first, falls back to Google News if Yahoo
    returns nothing.
    """
    ticker = ticker.upper()
    if ticker in _cache:
        return _cache[ticker]

    articles = _fetch_from_feed(RSS_FEEDS["yahoo"].format(ticker=ticker))
    if not articles:
        articles = _fetch_from_feed(RSS_FEEDS["google"].format(ticker=ticker))

    _cache[ticker] = articles
    return articles


def _fetch_from_feed(url: str) -> list[dict]:
    try:
        feed = feedparser.parse(url)
        articles = []
        for entry in feed.entries[:MAX_ARTICLES]:
            published_at = None
            if hasattr(entry, "published_parsed") and entry.published_parsed:
                try:
                    published_at = datetime(
                        *entry.published_parsed[:6], tzinfo=timezone.utc
                    ).isoformat()
                except Exception:
                    pass

            articles.append({
                "title": entry.get("title", "").strip(),
                "url": entry.get("link", ""),
                "source": feed.feed.get("title", ""),
                "published_at": published_at,
            })

        # Filter out anything with an empty title - occasionally RSS
        # feeds include malformed entries.
        return [a for a in articles if a["title"]]

    except Exception:
        # RSS fetch failed (network issue, feed down, etc.) -
        # return empty list rather than crashing the whole request.
        return []