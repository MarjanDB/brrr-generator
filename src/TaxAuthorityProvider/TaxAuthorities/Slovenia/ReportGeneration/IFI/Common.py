from typing import Sequence

import Core.FinancialEvents.Schemas.CommonFormats as cf
import Core.FinancialEvents.Schemas.ProcessedGenericFormats as pgf
import Core.FinancialEvents.Services.FinancialEventsProcessor as g
import TaxAuthorityProvider.Schemas.Configuration as tc
import TaxAuthorityProvider.TaxAuthorities.Slovenia.Schemas.Schemas as ss
from Core.FinancialEvents.Schemas.Events import TradeEventDerivative

SECURITY_MAPPING: dict[cf.GenericDerivativeReportAssetClassType, ss.EDavkiDerivativeSecurityType] = {
    cf.GenericDerivativeReportAssetClassType.OPTION: ss.EDavkiDerivativeSecurityType.OPTION,
    cf.GenericDerivativeReportAssetClassType.FUTURES_CONTRACT: ss.EDavkiDerivativeSecurityType.FUTURES_CONTRACT,
    cf.GenericDerivativeReportAssetClassType.CONTRACT_FOR_DIFFERENCE: ss.EDavkiDerivativeSecurityType.CONTRACT_FOR_DIFFERENCE,
    cf.GenericDerivativeReportAssetClassType.CERTIFICATE: ss.EDavkiDerivativeSecurityType.CERTIFICATE,
    # gf.GenericDerivativeReportAssetClassType.OTHER: ss.EDavkiDerivativeReportItemType.DERIVATIVE_SHORT,
}

GAIN_MAPPINGS: dict[cf.GenericDerivativeReportItemGainType, ss.EDavkiDerivativeReportGainType] = {
    cf.GenericDerivativeReportItemGainType.BOUGHT: ss.EDavkiDerivativeReportGainType.BOUGHT,
    cf.GenericDerivativeReportItemGainType.CAPITAL_INVESTMENT: ss.EDavkiDerivativeReportGainType.CAPITAL_INVESTMENT,
    cf.GenericDerivativeReportItemGainType.CAPITAL_RAISE: ss.EDavkiDerivativeReportGainType.CAPITAL_RAISE,
    cf.GenericDerivativeReportItemGainType.CAPITAL_ASSET: ss.EDavkiDerivativeReportGainType.CAPITAL_ASSET,
    cf.GenericDerivativeReportItemGainType.CAPITALIZATION_CHANGE: ss.EDavkiDerivativeReportGainType.CAPITALIZATION_CHANGE,
    cf.GenericDerivativeReportItemGainType.INHERITENCE: ss.EDavkiDerivativeReportGainType.INHERITENCE,
    cf.GenericDerivativeReportItemGainType.GIFT: ss.EDavkiDerivativeReportGainType.GIFT,
    cf.GenericDerivativeReportItemGainType.OTHER: ss.EDavkiDerivativeReportGainType.OTHER,
}


def convertBuy(
    line: pgf.TradeEventDerivativeAcquired,
) -> ss.EDavkiDerivativeReportSecurityLineGenericEventBought:
    return ss.EDavkiDerivativeReportSecurityLineGenericEventBought(
        BoughtOn=line.Date,
        GainType=GAIN_MAPPINGS[line.AcquiredReason],
        Quantity=line.ExchangedMoney.UnderlyingQuantity,
        PricePerUnit=line.ExchangedMoney.UnderlyingTradePrice,
        TotalPrice=line.ExchangedMoney.UnderlyingQuantity * line.ExchangedMoney.UnderlyingTradePrice * line.Multiplier,
        Leveraged=False,
    )


def convertSell(
    line: pgf.TradeEventDerivativeSold,
) -> ss.EDavkiDerivativeReportSecurityLineGenericEventSold:
    return ss.EDavkiDerivativeReportSecurityLineGenericEventSold(
        SoldOn=line.Date,
        Quantity=line.ExchangedMoney.UnderlyingQuantity,
        PricePerUnit=line.ExchangedMoney.UnderlyingTradePrice,
        TotalPrice=line.ExchangedMoney.UnderlyingQuantity * line.ExchangedMoney.UnderlyingTradePrice * line.Multiplier,
        Leveraged=False,
    )


def convertEvent(
    line: TradeEventDerivative,
) -> ss.EdavkiDerivativeReportSecurityLines:
    if isinstance(line, pgf.TradeEventDerivativeAcquired):
        return convertBuy(line)

    return convertSell(line)


def convertTradesToIfiItems(
    reportConfig: tc.TaxAuthorityConfiguration, data: Sequence[pgf.UnderlyingGrouping], countedProcessor: g.FinancialEventsProcessor
) -> list[ss.EDavkiGenericDerivativeReportItem]:
    converted: list[ss.EDavkiGenericDerivativeReportItem] = list()
    periodStart = reportConfig.fromDate
    periodEnd = reportConfig.toDate

    for isinGrouping in data:
        ISIN = isinGrouping.ISIN

        def isLotClosedInReportingPeriod(lot: pgf.TaxLotDerivative) -> bool:
            closedOn = lot.Sold.Date

            # lot was not closed during the reporting period, so its trades should not be included in the generated report
            return not (closedOn < periodStart or closedOn > periodEnd)

        validLots = list(filter(isLotClosedInReportingPeriod, isinGrouping.DerivativeTaxLots))
        isinGrouping.DerivativeTaxLots = validLots

        interestingGrouping = countedProcessor.process(isinGrouping)

        allLines = list(interestingGrouping.DerivativeTrades)
        allLines.sort(key=lambda line: line.Date)

        # If there are no lines to report on, do not add it to the ISIN to be reported
        if len(allLines) == 0:
            continue

        convertedLines = list(map(convertEvent, allLines))

        ForeignTaxPaid = sum(map(lambda entry: entry.ExchangedMoney.TaxTotal, allLines))
        HasForeignTax = True
        if ForeignTaxPaid <= 0:
            ForeignTaxPaid = None
            HasForeignTax = False

        ISINEntry = ss.EDavkiGenericDerivativeReportItem(
            InventoryListType=ss.EDavkiDerivativeSecurityType.OPTION,  # TODO: respect listing type SECURITY_MAPPING[securityType],
            ItemType=ss.EDavkiDerivativeReportItemType.DERIVATIVE,  # TODO: Actually check this for correct type
            Code=None,
            ISIN=ISIN,
            Name=None,
            HasForeignTax=HasForeignTax,
            ForeignTax=ForeignTaxPaid,
            FTCountryID=None,
            FTCountryName=None,
            Items=convertedLines,
        )

        converted.append(ISINEntry)

    return converted
