from connectors.csv_connector import CSVConnector


connector = CSVConnector("data/sample_market_data.csv")

df = connector.fetch("AAPL")

print(df.head())
print("\nShape:", df.shape)
print("\nColumns:", df.columns.tolist())