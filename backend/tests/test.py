import requests
import yfinance as yf

# 1. Create a custom requests session
session = requests.Session()

# 2. Add a realistic browser header
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
})

# 3. Pass the session into the download function
df = yf.download("AAPL", period="1y", session=session)
print(df)