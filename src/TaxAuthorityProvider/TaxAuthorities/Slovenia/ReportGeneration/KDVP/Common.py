from typing import Sequence

import src.TaxAuthorityProvider.Schemas.Configuration as tc
import src.TaxAuthorityProvider.Schemas.GenericFormats as gf
import src.TaxAuthorityProvider.TaxAuthorities.Slovenia.Schemas.Schemas as ss
import src.TaxAuthorityProvider.Utils.GenericUtilities as g

gUtils = g.GenericUtilities()

SECURITY_MAPPING: dict[gf.GenericTradeReportItemType, ss.EDavkiTradeSecurityType] = {
    gf.GenericTradeReportItemType.STOCK: ss.EDavkiTradeSecurityType.SECURITY,
    gf.GenericTradeReportItemType.STOCK_SHORT: ss.EDavkiTradeSecurityType.SECURITY_SHORT,
    gf.GenericTradeReportItemType.STOCK_CONTRACT: ss.EDavkiTradeSecurityType.SECURITY_WITH_CONTRACT,
    gf.GenericTradeReportItemType.STOCK_CONTRACT_SHORT: ss.EDavkiTradeSecurityType.SECURITY_WITH_CONTRACT_SHORT,
    gf.GenericTradeReportItemType.COMPANY_SHARE: ss.EDavkiTradeSecurityType.SHARE,
    gf.GenericTradeReportItemType.PLVPZOK: ss.EDavkiTradeSecurityType.SECURITY_WITH_CAPITAL_REDUCTION,
}

GAIN_MAPPINGS: dict[gf.GenericTradeReportItemGainType, ss.EDavkiTradeReportGainType] = {
    gf.GenericTradeReportItemGainType.BOUGHT: ss.EDavkiTradeReportGainType.BOUGHT,
    gf.GenericTradeReportItemGainType.CAPITAL_INVESTMENT: ss.EDavkiTradeReportGainType.CAPITAL_INVESTMENT,
    gf.GenericTradeReportItemGainType.CAPITAL_RAISE: ss.EDavkiTradeReportGainType.CAPITAL_RAISE,
    gf.GenericTradeReportItemGainType.CAPITAL_ASSET: ss.EDavkiTradeReportGainType.CAPITAL_ASSET_RAISE,
    gf.GenericTradeReportItemGainType.CAPITALIZATION_CHANGE: ss.EDavkiTradeReportGainType.CAPITALIZATION_CHANGE,
    gf.GenericTradeReportItemGainType.INHERITENCE: ss.EDavkiTradeReportGainType.INHERITENCE,
    gf.GenericTradeReportItemGainType.GIFT: ss.EDavkiTradeReportGainType.GIFT,
    gf.GenericTradeReportItemGainType.OTHER: ss.EDavkiTradeReportGainType.OTHER,
    gf.GenericTradeReportItemGainType.RIGHT_TO_NEWLY_ISSUED_STOCK: ss.EDavkiTradeReportGainType.OTHER,
}


def convertTradesToKdvpItems(
    reportConfig: tc.TaxAuthorityConfiguration, data: Sequence[gf.UnderlyingGrouping]
) -> list[ss.EDavkiGenericTradeReportItem]:
    converted: list[ss.EDavkiGenericTradeReportItem] = list()
    periodStart = reportConfig.fromDate
    periodEnd = reportConfig.toDate

    for isinGrouping in data:
        ISIN = isinGrouping.ISIN

        def isLotClosedInReportingPeriod(lot: gf.TradeTaxLotEventStock) -> bool:
            closedOn = lot.Sold.Date

            # lot was not closed during the reporting period, so its trades should not be included in the generated report
            return not (closedOn < periodStart or closedOn > periodEnd)

        validLots = list(filter(isLotClosedInReportingPeriod, isinGrouping.StockTaxLots))
        isinGrouping.StockTaxLots = validLots

        interestingGrouping = gUtils.generateInterestingUnderlyingGrouping(isinGrouping)

        def convertStockBuy(
            line: gf.TradeEventStockAcquired,
        ) -> ss.EDavkiTradeReportSecurityLineGenericEventBought:
            return ss.EDavkiTradeReportSecurityLineGenericEventBought(
                BoughtOn=line.Date,
                GainType=GAIN_MAPPINGS[line.AcquiredReason],
                Quantity=line.ExchangedMoney.UnderlyingQuantity,
                PricePerUnit=line.ExchangedMoney.UnderlyingTradePrice,
                TotalPrice=line.ExchangedMoney.UnderlyingQuantity * line.ExchangedMoney.UnderlyingTradePrice,
                InheritanceAndGiftTaxPaid=None,
                BaseTaxReduction=None,
            )

        def convertStockSell(
            line: gf.TradeEventStockSold,
        ) -> ss.EDavkiTradeReportSecurityLineGenericEventSold:
            return ss.EDavkiTradeReportSecurityLineGenericEventSold(
                SoldOn=line.Date,
                Quantity=line.ExchangedMoney.UnderlyingQuantity,
                PricePerUnit=line.ExchangedMoney.UnderlyingTradePrice,
                TotalPrice=line.ExchangedMoney.UnderlyingQuantity * line.ExchangedMoney.UnderlyingTradePrice,
                SatisfiesTaxBasisReduction=False,  # TODO: Wash sale handling
            )

        def convertStock(
            line: gf.TradeEventStockAcquired | gf.TradeEventStockSold,
        ) -> ss.EDavkiTradeReportSecurityLineGenericEventBought | ss.EDavkiTradeReportSecurityLineGenericEventSold:
            if isinstance(line, gf.TradeEventStockAcquired):
                return convertStockBuy(line)

            return convertStockSell(line)

        allLines = list(interestingGrouping.StockTrades)
        allLines.sort(key=lambda line: line.Date)

        # If there are no lines to report on, do not add it to the ISIN to be reported
        if len(allLines) == 0:
            continue

        convertedLines = list(map(convertStock, allLines))

        isTrustFund = isinGrouping.UnderlyingCategory == gf.GenericCategory.TRUST_FUND

        tickerSymbols = list(map(lambda line: line.Ticker, allLines)).pop()  # TODO: Maybe something better than just taking the last one?

        reportItem = ss.EDavkiTradeReportSecurityLineEvent(
            ISIN=ISIN,
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