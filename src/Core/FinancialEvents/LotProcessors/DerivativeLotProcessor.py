from typing import Sequence

import arrow as ar

import Core.FinancialEvents.Contracts.LotProcessor as lp
import src.Core.FinancialEvents.Schemas.CommonFormats as cf
import src.Core.FinancialEvents.Schemas.ProcessedGenericFormats as pgf
import src.Core.FinancialEvents.Schemas.StagingGenericFormats as sgf


class DerivativeLotProcessor(
    lp.LotProcessor[
        sgf.GenericTaxLotEventStaging,
        pgf.TradeTaxLotEventDerivative,
        Sequence[pgf.TradeEventDerivativeAcquired | pgf.TradeEventDerivativeSold],
    ]
):

    def process(
        self,
        input: sgf.GenericTaxLotEventStaging,
        references: Sequence[pgf.TradeEventDerivativeAcquired | pgf.TradeEventDerivativeSold],
    ) -> pgf.TradeTaxLotEventDerivative:
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
            print("Failed processing stock lot (ID: {}, ISIN: {}), found no match".format(input.ID, input.ISIN))
            raise StopIteration

        processed = pgf.TradeTaxLotEventDerivative(
            ID=input.ID,
            ISIN=input.ISIN,
            Quantity=input.Quantity,
            Acquired=matchingBuyById,
            Sold=matchingSoldByDate,
            ShortLongType=cf.GenericShortLong.LONG,
        )

        return processed
