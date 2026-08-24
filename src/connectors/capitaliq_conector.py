from .base import DataConnector


class CapitalIQConnector(DataConnector):

    def __init__(self, api_url=None, api_key=None):
        self.api_url = api_url
        self.api_key = api_key

    def fetch(self, entity):

        raise NotImplementedError(
            "Capital IQ connector requires authorized API access."
        )