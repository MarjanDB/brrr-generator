from dataclasses import dataclass
import arrow as ar
from enum import Enum
from typing import Sequence

class CurrencyConversionAccuracy(str, Enum):
    BY_SECOND = "BY_SECOND",
    BY_MINUTE = "BY_MINUTE",
    BY_HOUR = "BY_HOUR",
    BY_DAY = "BY_DAY"

@dataclass
class CurrencyConversionEntry:
    At: ar.Arrow
    Rate: float

class FromCurrencyToCurrencyConversionEntries:
    Accuracy: CurrencyConversionAccuracy
    Entries: Sequence[CurrencyConversionEntry]
    FromCurrency: str
    ToCurrency: str

    def __init__(self, fromCurrency: str, toCurrency: str, accuracy: CurrencyConversionAccuracy, entries: Sequence[CurrencyConversionEntry]) -> None:
        self.validateAccuracy(accuracy, entries)
        self.Accuracy = accuracy
        self.Entries = entries
        self.FromCurrency = fromCurrency
        self.ToCurrency = toCurrency

    def validateAccuracy(self, accuracy: CurrencyConversionAccuracy, entries: Sequence[CurrencyConversionEntry]):
        if accuracy is not CurrencyConversionAccuracy.BY_DAY:
            raise AssertionError("Unsupported Accuracy")
        
        # TODO: Validate accuracy


class ToCurrencyConversionProvider:
    Currency: str
    Entries: dict[CurrencyConversionAccuracy, dict[str, FromCurrencyToCurrencyConversionEntries]] = dict()

    def __init__(self, currency: str) -> None:
        self.Currency = currency

    def addCurrencyConversionEntry(self, entry: FromCurrencyToCurrencyConversionEntries):
        accuracy = entry.Accuracy
        toCurrency = entry.ToCurrency

        existing = self.Entries.get(accuracy, dict())
        existing[toCurrency] = entry
        self.Entries[accuracy] = existing

    def getConversionToCurrencyEntries(self, accuracy: CurrencyConversionAccuracy, currency: str) -> FromCurrencyToCurrencyConversionEntries:
        return self.Entries[accuracy][currency]




class CurrencyConversionProvider:
    Entries: dict[str, ToCurrencyConversionProvider] = dict()

    def addToCurrencyConversionEntry(self, entry: ToCurrencyConversionProvider):
        currency = entry.Currency
        self.Entries[currency] = entry

    def getToCurrencyProviderForCurrency(self, currency: str) -> ToCurrencyConversionProvider:
        return self.Entries[currency]

