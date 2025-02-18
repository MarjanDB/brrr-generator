from typing import Sequence

import Core.FinancialEvents.Schemas.CommonFormats as cf
import Core.FinancialEvents.Schemas.Grouping as pgf
import Core.FinancialEvents.Services.FinancialEventsProcessor as g
import TaxAuthorityProvider.Schemas.Configuration as tc
import TaxAuthorityProvider.TaxAuthorities.Slovenia.Schemas.Schemas as ss
from Core.FinancialEvents.Schemas.LotMatchingConfiguration import (
    LotMatchingConfiguration,
)
from Core.LotMatching.Contracts.LotMatchingMethod import LotMatchingMethod
from Core.LotMatching.Services.LotMatchingMethods.FifoLotMatchingMethod import (
    FifoLotMatchingMethod,
)
from Core.LotMatching.Services.LotMatchingMethods.ProvidedLotMatchingMethod import (
    ProvidedLotMatchingMethod,
)

SECURITY_MAPPING: dict[cf.GenericTradeReportItemType, ss.EDavkiTradeSecurityType] = {
    cf.GenericTradeReportItemType.STOCK: ss.EDavkiTradeSecurityType.SECURITY,
    cf.GenericTradeReportItemType.STOCK_SHORT: ss.EDavkiTradeSecurityType.SECURITY_SHORT,
    cf.GenericTradeReportItemType.STOCK_CONTRACT: ss.EDavkiTradeSecurityType.SECURITY_WITH_CONTRACT,
    cf.GenericTradeReportItemType.STOCK_CONTRACT_SHORT: ss.EDavkiTradeSecurityType.SECURITY_WITH_CONTRACT_SHORT,
    cf.GenericTradeReportItemType.COMPANY_SHARE: ss.EDavkiTradeSecurityType.SHARE,
    cf.GenericTradeReportItemType.PLVPZOK: ss.EDavkiTradeSecurityType.SECURITY_WITH_CAPITAL_REDUCTION,
}

GAIN_MAPPINGS: dict[cf.GenericTradeReportItemGainType, ss.EDavkiTradeReportGainType] = {
    cf.GenericTradeReportItemGainType.BOUGHT: ss.EDavkiTradeReportGainType.BOUGHT,
    cf.GenericTradeReportItemGainType.CAPITAL_INVESTMENT: ss.EDavkiTradeReportGainType.CAPITAL_INVESTMENT,
    cf.GenericTradeReportItemGainType.CAPITAL_RAISE: ss.EDavkiTradeReportGainType.CAPITAL_RAISE,
    cf.GenericTradeReportItemGainType.CAPITAL_ASSET: ss.EDavkiTradeReportGainType.CAPITAL_ASSET_RAISE,
    cf.GenericTradeReportItemGainType.CAPITALIZATION_CHANGE: ss.EDavkiTradeReportGainType.CAPITALIZATION_CHANGE,
    cf.GenericTradeReportItemGainType.INHERITENCE: ss.EDavkiTradeReportGainType.INHERITENCE,
    cf.GenericTradeReportItemGainType.GIFT: ss.EDavkiTradeReportGainType.GIFT,
    cf.GenericTradeReportItemGainType.OTHER: ss.EDavkiTradeReportGainType.OTHER,
    cf.GenericTradeReportItemGainType.RIGHT_TO_NEWLY_ISSUED_STOCK: ss.EDavkiTradeReportGainType.OTHER,
}


def convertStockBuy(
    line: pgf.TradeEventStockAcquired,
) -> ss.EDavkiTradeReportSecurityLineGenericEventBought:
    return ss.EDavkiTradeReportSecurityLineGenericEventBought(
        BoughtOn=line.Date,
        GainType=GAIN_MAPPINGS[line.AcquiredReason],
        Quantity=line.ExchangedMoney.UnderlyingQuantity,
        PricePerUnit=line.ExchangedMoney.UnderlyingTradePrice,
        PricePerUnitInOriginalCurrency=line.ExchangedMoney.UnderlyingTradePrice * (1 / line.ExchangedMoney.FxRateToBase),
        TotalPrice=line.ExchangedMoney.UnderlyingQuantity * line.ExchangedMoney.UnderlyingTradePrice,
        TotalPriceInOriginalCurrency=line.ExchangedMoney.UnderlyingQuantity
        * line.ExchangedMoney.UnderlyingTradePrice
        * (1 / line.ExchangedMoney.FxRateToBase),
        Commissions=line.ExchangedMoney.ComissionTotal,
        CommissionsInOriginalCurrency=line.ExchangedMoney.ComissionTotal * (1 / line.ExchangedMoney.FxRateToBase),
        InheritanceAndGiftTaxPaid=None,
        BaseTaxReduction=None,
    )


def convertStockSell(
    line: pgf.TradeEventStockSold,
) -> ss.EDavkiTradeReportSecurityLineGenericEventSold:
    return ss.EDavkiTradeReportSecurityLineGenericEventSold(
        SoldOn=line.Date,
        Quantity=line.ExchangedMoney.UnderlyingQuantity,
        PricePerUnit=line.ExchangedMoney.UnderlyingTradePrice,
        PricePerUnitInOriginalCurrency=line.ExchangedMoney.UnderlyingTradePrice * (1 / line.ExchangedMoney.FxRateToBase),
        TotalPrice=line.ExchangedMoney.UnderlyingQuantity * line.ExchangedMoney.UnderlyingTradePrice,
        TotalPriceInOriginalCurrency=line.ExchangedMoney.UnderlyingQuantity
        * line.ExchangedMoney.UnderlyingTradePrice
        * (1 / line.ExchangedMoney.FxRateToBase),
        Commissions=line.ExchangedMoney.ComissionTotal,
        CommissionsInOriginalCurrency=line.ExchangedMoney.ComissionTotal * (1 / line.ExchangedMoney.FxRateToBase),
        SatisfiesTaxBasisReduction=False,  # TODO: Wash sale handling
    )


def convertStock(
    line: pgf.TradeEventStockAcquired | pgf.TradeEventStockSold,
) -> ss.EDavkiTradeReportSecurityLineGenericEventBought | ss.EDavkiTradeReportSecurityLineGenericEventSold:
    if isinstance(line, pgf.TradeEventStockAcquired):
        return convertStockBuy(line)

    return convertStockSell(line)


def convertTradesToKdvpItems(
    reportConfig: tc.TaxAuthorityConfiguration, data: Sequence[pgf.FinancialGrouping], countedProcessor: g.FinancialEventsProcessor
) -> list[ss.EDavkiGenericTradeReportItem]:
    converted: list[ss.EDavkiGenericTradeReportItem] = list()
    periodStart = reportConfig.fromDate
    periodEnd = reportConfig.toDate

    if reportConfig.lotMatchingMethod == tc.TaxAuthorityLotMatchingMethod.PROVIDED:

        def matchingMethodFactory(grouping: pgf.FinancialGrouping) -> LotMatchingMethod:
            return ProvidedLotMatchingMethod(grouping.StockTaxLots)

    else:

        def matchingMethodFactory(grouping: pgf.FinancialGrouping) -> LotMatchingMethod:
            return FifoLotMatchingMethod()

    for isinGrouping in data:
        ISIN = isinGrouping.FinancialIdentifier.getIsin()

        lotMatchingConfiguration = LotMatchingConfiguration(
            fromDate=periodStart,
            toDate=periodEnd,
            forStocks=matchingMethodFactory,
            forDerivatives=matchingMethodFactory,
        )

        interestingGrouping = countedProcessor.process(isinGrouping, lotMatchingConfiguration)

        allLines = list(interestingGrouping.StockTrades)
        allLines.sort(key=lambda line: line.Date)

        # If there are no lines to report on, do not add it to the ISIN to be reported
        if len(allLines) == 0:
            continue

        convertedLines = list(map(convertStock, allLines))

        isTrustFund = isinGrouping.UnderlyingCategory == cf.GenericCategory.TRUST_FUND

        tickerSymbols = list(
            map(lambda line: line.FinancialIdentifier.getTicker(), allLines)
        ).pop()  # TODO: Maybe something better than just taking the last one?

        reportItem = ss.EDavkiTradeReportSecurityLineEvent(
            ISIN=ISIN or "",  # TODO: Security line has 3 possible identifiers, not just isin
            Code=tickerSymbols,
            Name=None,
            IsFund=isTrustFund,
            Resolution=None,
            ResolutionDate=None,
            Events=convertedLines,
        )

        ForeignTaxPaid = sum(map(lambda entry: entry.ExchangedMoney.TaxTotal or 0, allLines))
        HasForeignTax = True
        if ForeignTaxPaid <= 0:
            ForeignTaxPaid = None
            HasForeignTax = False

        ISINEntry = ss.EDavkiGenericTradeReportItem(
            ItemID=None,
            InventoryListType=ss.EDavkiTradeSecurityType.SECURITY,  # TODO: Respect listing type
            Name=None,
            HasForeignTax=HasForeignTax,
            ForeignTax=ForeignTaxPaid,
            FTCountryID=None,
            FTCountryName=None,
            HasLossTransfer=None,
            ForeignTransfer=None,
            TaxDecreaseConformance=False,
            Items=[reportItem],
        )

        converted.append(ISINEntry)

    return converted
