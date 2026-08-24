import os
import requests
import pandas as pd

from dotenv import load_dotenv
from data_processor import json_to_dataframe
from pivot_detector import detect_statistical_pivots
from pivot_analysis import analyze_pivot
from visualizer import plot_pivots
from feature_engineering import add_features
from change_point_detector import detect_cusum
from event_engine import calculate_event_score


load_dotenv()

API_KEY = os.getenv("ALPHAVANTAGE_API_KEY")

url = "https://www.alphavantage.co/query"

params = {
    "function": "TIME_SERIES_DAILY",
    "symbol": "AAPL",
    "outputsize": "compact",
    "apikey": API_KEY
}

response = requests.get(url, params=params, timeout=10)

print("Status:", response.status_code)

data = response.json()
print(data)

if "Time Series (Daily)" not in data:

    print("API did not return market data.")

    if "Information" in data:
        print("API Information:", data["Information"])

    elif "Note" in data:
        print("API Note:", data["Note"])

    elif "Error Message" in data:
        print("API Error:", data["Error Message"])

    raise SystemExit

time_series = data["Time Series (Daily)"]

df = json_to_dataframe(time_series)
df = add_features(df)
print(df.head(25))
print(df.dtypes)


df = detect_statistical_pivots(df)
df = detect_cusum(df)


events = []

pivot_indices = df.index[
    df["is_statistical_pivot"]
].tolist()

for index in pivot_indices:

    event = analyze_pivot(df, index)

    is_change_point = df.loc[
        index,
        "is_change_point"
    ]

    event_score = calculate_event_score(
        event,
        is_change_point
    )

    event["is_change_point"] = is_change_point
    event["event_score"] = event_score

    events.append(event)

events_df = pd.DataFrame(events)

print("\n========== EVENT TABLE ==========\n")

print(
    events_df[
        [
            "pivot_date",
            "pivot_return",
            "pivot_z_score",
            "volume_change",
            "volatility_shift",
            "reversal_ratio",
            "post_pivot_return",
            "is_change_point",
            "event_type",
            "event_score"
        ]
    ]
)
plot_pivots(df)