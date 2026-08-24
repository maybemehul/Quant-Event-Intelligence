import os
import requests

from dotenv import load_dotenv
from .base import DataConnector


class AlphaVantageConnector(DataConnector):

    def __init__(self):
        load_dotenv()
        self.api_key = os.getenv("ALPHAVANTAGE_API_KEY")

    def fetch(self, entity):

        url = "https://www.alphavantage.co/query"

        params = {
            "function": "TIME_SERIES_DAILY",
            "symbol": entity,
            "outputsize": "compact",
            "apikey": self.api_key
        }

        response = requests.get(
            url,
            params=params,
            timeout=10
        )

        data = response.json()

        if "Time Series (Daily)" not in data:
            raise RuntimeError(
                "Alpha Vantage did not return market data."
            )

        from data_processor import json_to_dataframe

        return json_to_dataframe(
            data["Time Series (Daily)"]
        )