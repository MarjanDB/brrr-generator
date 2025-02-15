from typing import Callable

from arrow import Arrow

import Core.FinancialEvents.Schemas.Grouping as pgf
from Core.LotMatching.Contracts.LotMatchingMethod import LotMatchingMethod


class LotMatchingConfiguration:
    ForStocks: Callable[[pgf.FinancialGrouping], LotMatchingMethod]
    ForDerivatives: Callable[[pgf.FinancialGrouping], LotMatchingMethod]

    fromDate: Arrow
    toDate: Arrow

    def __init__(
        self,
        fromDate: Arrow,
        toDate: Arrow,
        forStocks: Callable[[pgf.FinancialGrouping], LotMatchingMethod],
        forDerivatives: Callable[[pgf.FinancialGrouping], LotMatchingMethod],
    ) -> None:
        self.ForStocks = forStocks
        self.ForDerivatives = forDerivatives
        self.fromDate = fromDate
        self.toDate = toDate
