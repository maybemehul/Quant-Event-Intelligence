import os
import sqlite3
import requests
import json
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timezone
import sys

sys.path.append("../src")

from llm_engine import generate_insight


load_dotenv()

ALPHAVANTAGE_API_KEY = os.getenv("ALPHAVANTAGE_API_KEY")

DB = "watchlist.db"
CACHE_MINUTES = 15


app = FastAPI(title="Smart Market Watchlist API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn


def get_cached_data(symbol: str):
    conn = get_db()

    row = conn.execute(
        """
        SELECT data, fetched_at
        FROM market_cache
        WHERE symbol = ?
        """,
        (symbol,)
    ).fetchone()

    conn.close()

    if not row:
        return None

    fetched_at = datetime.fromisoformat(row["fetched_at"])
    age_minutes = (
        datetime.now(timezone.utc) - fetched_at
    ).total_seconds() / 60

    if age_minutes >= CACHE_MINUTES:
        return None

    return json.loads(row["data"])


def save_cached_data(symbol: str, data):
    timestamp = datetime.now(timezone.utc).isoformat()

    conn = get_db()

    conn.execute(
        """
        INSERT INTO market_cache (symbol, data, fetched_at)
        VALUES (?, ?, ?)
        ON CONFLICT(symbol)
        DO UPDATE SET
            data = excluded.data,
            fetched_at = excluded.fetched_at
        """,
        (
            symbol,
            json.dumps(data),
            timestamp
        )
    )

    conn.commit()
    conn.close()

def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS watchlist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT UNIQUE NOT NULL,
            added_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS market_cache (
            symbol TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            fetched_at TEXT NOT NULL
        )
    """)
    conn.execute("""
    CREATE TABLE IF NOT EXISTS app_state (
        key TEXT PRIMARY KEY,
        value TEXT
    )""")
    conn.execute("""
    CREATE TABLE IF NOT EXISTS market_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        price REAL NOT NULL,
        checked_at TEXT NOT NULL
    )""")

    conn.commit()
    conn.close()
    


init_db()
def get_previous_snapshot(symbol: str):
    conn = get_db()

    row = conn.execute(
        """
        SELECT price, checked_at
        FROM market_snapshots
        WHERE symbol = ?
        ORDER BY checked_at DESC
        LIMIT 1
        """,
        (symbol,)
    ).fetchone()


    conn.close()

    return dict(row) if row else None


def save_snapshot(symbol: str, price: float):
    timestamp = datetime.now(timezone.utc).isoformat()

    conn = get_db()

    conn.execute(
        """
        INSERT INTO market_snapshots
        (symbol, price, checked_at)
        VALUES (?, ?, ?)
        """,
        (symbol, price, timestamp)
    )

    conn.commit()
    conn.close()
@app.get("/last-checked")
def get_last_checked():
    conn = get_db()

    row = conn.execute(
        "SELECT value FROM app_state WHERE key = 'last_checked'"
    ).fetchone()

    conn.close()

    return {
        "last_checked": row["value"] if row else None
    }


@app.post("/last-checked")
def update_last_checked():
    timestamp = datetime.now(timezone.utc).isoformat()

    conn = get_db()

    conn.execute(
        """
        INSERT INTO app_state (key, value)
        VALUES ('last_checked', ?)
        ON CONFLICT(key)
        DO UPDATE SET value = excluded.value
        """,
        (timestamp,)
    )

    conn.commit()
    conn.close()

    return {
        "last_checked": timestamp
    }


class Stock(BaseModel):
    symbol: str

def calculate_meaningful_change(
    change_percent: float,
    volume: int,
    avg_volume: int | None = None,
):
    score = 0
    reasons = []

    # Price movement
    abs_change = abs(change_percent)

    if abs_change >= 5:
        score += 40
        reasons.append("Large price movement")
    elif abs_change >= 3:
        score += 25
        reasons.append("Significant price movement")
    elif abs_change >= 2:
        score += 15
        reasons.append("Elevated price movement")

    # Volume confirmation
    if avg_volume and avg_volume > 0:
        volume_ratio = volume / avg_volume

        if volume_ratio >= 2:
            score += 30
            reasons.append("Volume significantly above normal")
        elif volume_ratio >= 1.5:
            score += 20
            reasons.append("Volume above normal")
        elif volume_ratio >= 1.2:
            score += 10
            reasons.append("Elevated trading volume")

    # Cap score
    score = min(score, 100)

    if score >= 70:
        priority = "High"
    elif score >= 40:
        priority = "Medium"
    else:
        priority = "Low"

    return {
        "score": score,
        "priority": priority,
        "reasons": reasons,
    }
@app.get("/market/{symbol}")
def get_market_data(symbol: str):
    symbol = symbol.strip().upper()

    if not ALPHAVANTAGE_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Alpha Vantage API key is not configured"
        )

    url = "https://www.alphavantage.co/query"

    params = {
        "function": "GLOBAL_QUOTE",
        "symbol": symbol,
        "apikey": ALPHAVANTAGE_API_KEY,
    }

    response = requests.get(url, params=params, timeout=10)
    response.raise_for_status()

    data = response.json()

    if "Note" in data:
        raise HTTPException(
            status_code=429,
            detail="Alpha Vantage rate limit reached"
        )

    if "Information" in data:
        raise HTTPException(
            status_code=503,
            detail=data["Information"]
        )

    quote = data.get("Global Quote")

    if not quote or not quote.get("05. price"):
        raise HTTPException(
            status_code=404,
            detail=f"No market data found for {symbol}"
        )

    return {
        "symbol": symbol,
        "price": float(quote["05. price"]),
        "change": float(quote["09. change"]),
        "change_percent": quote["10. change percent"],
        "volume": int(quote["06. volume"]),
        "latest_trading_day": quote["07. latest trading day"],
    }
def get_historical_data(symbol: str):
    symbol = symbol.strip().upper()

    # Use cached data first
    cached = get_cached_data(f"HISTORY_{symbol}")

    if cached:
        return cached

    # Fetch live market data
    end_time = int(datetime.now(timezone.utc).timestamp())
    start_time = end_time - (120 * 24 * 60 * 60)

    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"

    params = {
        "period1": start_time,
        "period2": end_time,
        "interval": "1d",
        "events": "history",
    }

    response = requests.get(
        url,
        params=params,
        timeout=10,
        headers={
            "User-Agent": "Mozilla/5.0"
        }
    )

    response.raise_for_status()

    data = response.json()

    result = data.get("chart", {}).get("result")

    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"No historical data found for {symbol}"
        )

    result = result[0]

    timestamps = result.get("timestamp", [])
    quote = result.get("indicators", {}).get("quote", [{}])[0]

    closes = quote.get("close", [])
    opens = quote.get("open", [])
    highs = quote.get("high", [])
    lows = quote.get("low", [])
    volumes = quote.get("volume", [])

    rows = []

    for i, timestamp in enumerate(timestamps):
        if closes[i] is None:
            continue

        date = datetime.fromtimestamp(
            timestamp,
            timezone.utc
        ).strftime("%Y-%m-%d")

        rows.append({
            "date": date,
            "open": float(opens[i]),
            "high": float(highs[i]),
            "low": float(lows[i]),
            "close": float(closes[i]),
            "volume": int(volumes[i]),
        })

    if len(rows) < 21:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough historical data found for {symbol}"
        )

    rows.sort(key=lambda x: x["date"])

    # Cache the live result
    save_cached_data(
        f"HISTORY_{symbol}",
        rows
    )

    return rows
@app.get("/history/{symbol}")
def get_stock_history(symbol: str):
    symbol = symbol.strip().upper()

    try:
        history = get_historical_data(symbol)

        if not history:
            raise HTTPException(
                status_code=404,
                detail=f"No market data found for {symbol}"
            )

        return {
            "symbol": symbol,
            "history": history,
            "data_status": "available"
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Unable to retrieve market data for {symbol}"
        )
@app.get("/meaningful-change/{symbol}")
def get_meaningful_change(symbol: str):
    history = get_historical_data(symbol)

    if len(history) < 21:
        raise HTTPException(
            status_code=400,
            detail="Not enough historical data"
        )

    latest = history[-1]
    previous = history[-2]
    previous_snapshot = get_previous_snapshot(symbol)


    # Daily returns
    returns = []

    for i in range(1, len(history)):
        previous_close = history[i - 1]["close"]
        current_close = history[i]["close"]

        daily_return = (
            current_close / previous_close
        ) - 1

        returns.append(daily_return)

    current_return = returns[-1]

    # 20-day baseline
    baseline_returns = returns[-21:-1]

    avg_return = sum(baseline_returns) / len(baseline_returns)

    variance = sum(
        (r - avg_return) ** 2
        for r in baseline_returns
    ) / len(baseline_returns)

    volatility = variance ** 0.5

    # Z-score
    if volatility > 0:
        z_score = (
            current_return - avg_return
        ) / volatility
    else:
        z_score = 0

    # Volume baseline
    baseline_volume = [
        row["volume"]
        for row in history[-21:-1]
    ]

    avg_volume = (
        sum(baseline_volume)
        / len(baseline_volume)
    )

    volume_ratio = (
        latest["volume"] / avg_volume
        if avg_volume > 0
        else 0
    )

    # Meaningful-change score
    score = 0
    reasons = []

    if abs(z_score) >= 3:
        score += 40
        reasons.append("Extreme movement vs normal")

    elif abs(z_score) >= 2:
        score += 25
        reasons.append("Unusual movement vs normal")

    elif abs(z_score) >= 1.5:
        score += 15
        reasons.append("Elevated movement vs normal")

    if volume_ratio >= 2:
        score += 30
        reasons.append("Volume significantly above normal")

    elif volume_ratio >= 1.5:
        score += 20
        reasons.append("Volume above normal")

    elif volume_ratio >= 1.2:
        score += 10
        reasons.append("Elevated trading volume")

    score = min(score, 100)

    if score >= 70:
        priority = "High"
    elif score >= 40:
        priority = "Medium"
    else:
        priority = "Low"
    

    if previous_snapshot:
        change_since_check = (
            (latest["close"] - previous_snapshot["price"])
            / previous_snapshot["price"]
        ) * 100
    else:
        change_since_check = 0



    return {
        "symbol": symbol.upper(),
        "price": latest["close"],
        
        "change": round(
            (latest["close"] - previous["close"]), 2
        ),
        "change_percent": round(
            current_return * 100, 2
        ),
        "change_since_check": round(change_since_check, 2),
        "previous_check": (
            previous_snapshot["checked_at"]
            if previous_snapshot
            else None
        ),
        "volume": latest["volume"],
        "average_volume": round(avg_volume),
        "volume_ratio": round(volume_ratio, 2),
        "z_score": round(z_score, 2),
        "volatility": round(volatility, 4),
        "latest_trading_day": latest["date"],
        "score": score,
        "priority": priority,
        "reasons": reasons,
    }
@app.post("/check/{symbol}")
def check_stock(symbol: str):
    symbol = symbol.strip().upper()

    try:
        result = get_meaningful_change(symbol)

        save_snapshot(symbol, result["price"])

        return {
            **result,
            "data_status": "available"
        }

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=502,
            detail=f"Unable to retrieve market data for {symbol}"
        )
@app.get("/")
def root():
    return {"message": "Smart Market Watchlist API is running"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/watchlist")
def get_watchlist():
    conn = get_db()
    rows = conn.execute(
        "SELECT id, symbol, added_at FROM watchlist ORDER BY added_at"
    ).fetchall()
    conn.close()

    return [dict(row) for row in rows]


@app.post("/watchlist")
def add_stock(stock: Stock):
    symbol = stock.symbol.strip().upper()

    if not symbol:
        raise HTTPException(status_code=400, detail="Symbol is required")

    conn = get_db()

    try:
        cursor = conn.execute(
            "INSERT INTO watchlist (symbol) VALUES (?)",
            (symbol,)
        )
        conn.commit()

        stock_id = cursor.lastrowid

    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(
            status_code=409,
            detail=f"{symbol} is already in your watchlist"
        )

    conn.close()

    return {
        "id": stock_id,
        "symbol": symbol
    }


@app.delete("/watchlist/{symbol}")
def remove_stock(symbol: str):
    symbol = symbol.strip().upper()

    conn = get_db()

    cursor = conn.execute(
        "DELETE FROM watchlist WHERE symbol = ?",
        (symbol,)
    )

    conn.commit()
    deleted = cursor.rowcount
    conn.close()

    if deleted == 0:
        raise HTTPException(
            status_code=404,
            detail=f"{symbol} not found in watchlist"
        )

    return {
        "message": f"{symbol} removed",
        "symbol": symbol
    }
@app.post("/ai-insight/{symbol}")
def get_ai_insight(symbol: str):
    symbol = symbol.strip().upper()

    try:
        evidence = get_meaningful_change(symbol)
        insight = generate_insight(evidence)

        return {
            "symbol": symbol,
            "insight": insight,
        }

    except HTTPException:
        raise

    except Exception as e:
        print(f"AI INSIGHT ERROR for {symbol}: {e}")

        raise HTTPException(
            status_code=502,
            detail=f"AI insight unavailable: {str(e)}"
        )