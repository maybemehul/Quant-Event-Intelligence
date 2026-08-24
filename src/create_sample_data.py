import pandas as pd
import numpy as np


np.random.seed(42)

dates = pd.bdate_range(
    start="2026-03-31",
    periods=100
)

returns = np.random.normal(
    0.001,
    0.015,
    len(dates)
)

# Add a few artificial market events
returns[45] = -0.06
returns[60] = -0.08
returns[80] = 0.07

prices = [250]

for r in returns:
    prices.append(prices[-1] * (1 + r))

prices = prices[1:]

df = pd.DataFrame({
    "date": dates,
    "open": np.array(prices) * np.random.uniform(0.995, 1.005, len(prices)),
    "high": np.array(prices) * np.random.uniform(1.005, 1.02, len(prices)),
    "low": np.array(prices) * np.random.uniform(0.98, 0.995, len(prices)),
    "close": prices,
    "volume": np.random.randint(
        30_000_000,
        80_000_000,
        len(prices)
    )
})

df.to_csv(
    "data/sample_market_data.csv",
    index=False
)

print("Sample dataset created.")
print(df.head())
print("\nRows:", len(df))