from abc import ABC, abstractmethod


class DataConnector(ABC):

    @abstractmethod
    def fetch(self, entity):
        pass