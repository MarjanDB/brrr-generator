from typing import Sequence

import arrow as ar

import Core.FinancialEvents.Schemas.CommonFormats as cf
import Core.FinancialEvents.Schemas.FinancialIdentifier as cfi
import Core.FinancialEvents.Schemas.Grouping as pgf
from Core.StagingFinancialEvents.Contracts.LotProcessor import LotProcessor
from Core.StagingFinancialEvents.Schemas.Lots import StagingTaxLot


class DerivativeLotProcessor(
    LotProcessor[
        StagingTaxLot,
        pgf.TaxLotDerivative,
        Sequence[pgf.TradeEventDerivativeAcquired | pgf.TradeEventDerivativeSold],
    ]
):

    def process(
        self,
        input: StagingTaxLot,
        references: Sequence[pgf.TradeEventDerivativeAcquired | pgf.TradeEventDerivativeSold],
    ) -> pgf.TaxLotDerivative:
        # print("Processing stock lot (ID: {})".format(lot.ID))

        allBuys: list[pgf.TradeEventDerivativeAcquired] = list(filter(lambda trade: isinstance(trade, pgf.TradeEventDerivativeAcquired), references))  # type: ignore
        allSells: list[pgf.TradeEventDerivativeSold] = list(filter(lambda trade: isinstance(trade, pgf.TradeEventDerivativeSold), references))  # type: ignore

        # TODO: Validate returns since buys and sells are merged
        # TODO: What to do when no match is found?
        try:
            matchingBuyById = self.utils.findStockEventById(input.Acquired.ID or "", allBuys)
            matchingSoldByDate = self.utils.findStockEventByDate(input.Sold.DateTime or ar.get("1-0-0"), allSells)[0]

            # print("Matched Buy with trade (ID: {}, DateTime: {})".format(matchingBuyById.ID, matchingBuyById.Date))
            # print("Matched Sell with trade (ID: {}, DateTime: {})".format(matchingSoldByDate.ID, matchingSoldByDate.Date))
        except StopIteration:
            print(
                "Failed processing stock lot (ID: {}, FinancialIdentifier: {}), found no match".format(input.ID, input.FinancialIdentifier)
            )
            raise StopIteration

        processed = pgf.TaxLotDerivative(
            ID=input.ID,
            FinancialIdentifier=cfi.FinancialIdentifier.fromStagingIdentifier(input.FinancialIdentifier),
            Quantity=input.Quantity,
            Acquired=matchingBuyById,
            Sold=matchingSoldByDate,
            ShortLongType=cf.GenericShortLong.LONG,
        )

        return processed
