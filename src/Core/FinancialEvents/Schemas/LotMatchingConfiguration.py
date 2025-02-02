from dataclasses import dataclass
from typing import Callable

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

    def __init__(
        self,
        forStocks: Callable[[pgf.FinancialGrouping], LotMatchingMethod] | None = None,
        forDerivatives: Callable[[pgf.FinancialGrouping], LotMatchingMethod] | None = None,
    ) -> None:
        self.ForStocks = forStocks or defaultForStocks
        self.ForDerivatives = forDerivatives or defaultForDerivatives
