from dataclasses import dataclass
from typing import Generic, TypeVar

CASH_TRANSACTION = TypeVar("CASH_TRANSACTION")
CORPORATE_ACTION = TypeVar("CORPORATE_ACTION")

STOCK_TRADE = TypeVar("STOCK_TRADE")
STOCK_LOT = TypeVar("STOCK_LOT")

DERIVATIVE_TRADE = TypeVar("DERIVATIVE_TRADE")
DERIVATIVE_LOT = TypeVar("DERIVATIVE_LOT")


@dataclass
class CommonBrokerageEvents(Generic[CASH_TRANSACTION, CORPORATE_ACTION, STOCK_TRADE, STOCK_LOT, DERIVATIVE_TRADE, DERIVATIVE_LOT]):
    # cashTrades: list[TransactionCash]
    cashTransactions: list[CASH_TRANSACTION]

    corporateActions: list[CORPORATE_ACTION]

    stockTrades: list[STOCK_TRADE]
    stockLots: list[STOCK_LOT]

    derivativeTrades: list[DERIVATIVE_TRADE]
    derivativeLots: list[DERIVATIVE_LOT]
