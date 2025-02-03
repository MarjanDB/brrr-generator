from dataclasses import dataclass
from typing import Callable

from arrow import Arrow

import Core.FinancialEvents.Schemas.Grouping as pgf
from Core.LotMatching.Contracts.LotMatchingMethod import LotMatchingMethod
from Core.LotMatching.Services.LotMatchingMethods.ProvidedLotMatchingMethod import (
    ProvidedLotMatchingMethod,
)


def defaultForStocks(grouping: pgf.FinancialGrouping) -> LotMatchingMethod:
    return ProvidedLotMatchingMethod(grouping.StockTaxLots)


def defaultForDerivatives(grouping: pgf.FinancialGrouping) -> LotMatchingMethod:
    return ProvidedLotMatchingMethod(grouping.DerivativeTaxLots)


class LotMatchingConfiguration:
    ForStocks: Callable[[pgf.FinancialGrouping], LotMatchingMethod]
    ForDerivatives: Callable[[pgf.FinancialGrouping], LotMatchingMethod]

    fromDate: Arrow
    toDate: Arrow

    def __init__(
        self,
        fromDate: Arrow,
        toDate: Arrow,
        forStocks: Callable[[pgf.FinancialGrouping], LotMatchingMethod] | None = None,
        forDerivatives: Callable[[pgf.FinancialGrouping], LotMatchingMethod] | None = None,
    ) -> None:
        self.ForStocks = forStocks or defaultForStocks
        self.ForDerivatives = forDerivatives or defaultForDerivatives
        self.fromDate = fromDate
        self.toDate = toDate
