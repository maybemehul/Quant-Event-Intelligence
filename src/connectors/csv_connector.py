import pandas as pd

from .base import DataConnector


class CSVConnector(DataConnector):

    def __init__(self, file_path):
        self.file_path = file_path

    def fetch(self, entity=None):

        df = pd.read_csv(self.file_path)

        df["date"] = pd.to_datetime(df["date"])

        df = df.sort_values("date").reset_index(drop=True)

        return df