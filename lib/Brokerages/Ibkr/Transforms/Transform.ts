import { StagingFinancialIdentifier } from "@brrr/Core/Schemas/Staging/StagingFinancialIdentifier.ts";
import type {
	StagingTradeEventCashTransactionDividend,
	StagingTradeEventCashTransactionPaymentInLieuOfDividends,
	StagingTradeEventCashTransactionWithholdingTax,
	StagingTradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividends,
	StagingTradeEventDerivativeAcquired,
	StagingTradeEventDerivativeSold,
	StagingTradeEventStockAcquired,
	StagingTradeEventStockSold,
} from "@brrr/Core/Schemas/Staging/Events.ts";
import type { StagingFinancialGrouping } from "@brrr/Core/Schemas/Staging/Grouping.ts";
import type { StagingTaxLot } from "@brrr/Core/Schemas/Staging/Lots.ts";
import {
	StagingIdentifierChangeType,
	type StagingIdentifierRelationshipPartialAny,
	type StagingIdentifierRelationships,
} from "@brrr/Core/Schemas/Staging/IdentifierRelationship.ts";
import type { StagingFinancialEvents } from "@brrr/Core/Schemas/Staging/StagingFinancialEvents.ts";
import {
	GenericAssetClass,
	GenericCategory,
	GenericDerivativeReportItemGainType,
	GenericDividendType,
	GenericShortLong,
	GenericTradeReportItemGainType,
} from "@brrr/Core/Schemas/CommonFormats.ts";
import { CashTransactionType } from "@brrr/Brokerages/Ibkr/Schemas/IbkrSchemas.ts";
import type {
	CorporateAction,
	LotDerivative,
	LotStock,
	TradeDerivative,
	TradeStock,
	TransactionCash,
} from "@brrr/Brokerages/Ibkr/Schemas/IbkrSchemas.ts";
import type { SegmentedTrades } from "@brrr/Brokerages/Ibkr/Schemas/SegmentedTrades.ts";

function convertToCashTransactions(
	cashTransactions: TransactionCash[],
) {
	return cashTransactions.map((transaction) => {
		const descLower = transaction.description.toLowerCase();
		const isOrdinaryDividend = descLower.includes("ordinary dividend");
		const isBonusDividend = descLower.includes("bonus dividend");
		const isPaymentInLieuWithholding = descLower.includes("payment in lieu of dividend");

		let dividendType = GenericDividendType.UNKNOWN;
		if (isOrdinaryDividend) dividendType = GenericDividendType.ORDINARY;
		if (isBonusDividend) dividendType = GenericDividendType.BONUS;

		const financialIdentifier = new StagingFinancialIdentifier({ isin: transaction.isin, ticker: transaction.symbol });
		const exchangedMoney = {
			underlyingQuantity: 1,
			underlyingTradePrice: transaction.amount * transaction.fxRateToBase,
			underlyingCurrency: transaction.currency,
			comissionCurrency: transaction.currency,
			comissionTotal: 0,
			taxCurrency: transaction.currency,
			taxTotal: 0,
			fxRateToBase: transaction.fxRateToBase,
		};
		const base = {
			id: transaction.transactionID,
			financialIdentifier,
			assetClass: GenericAssetClass.CASH_AND_CASH_EQUIVALENTS,
			date: transaction.dateTime,
			multiplier: 1,
			exchangedMoney,
			actionId: transaction.actionID,
			transactionId: transaction.transactionID,
			listingExchange: transaction.listingExchange,
		};

		if (transaction.type === CashTransactionType.DIVIDEND) {
			const result: StagingTradeEventCashTransactionDividend = {
				...base,
				kind: "StagingCashTransactionDividend",
				dividendType,
			};
			return result;
		}

		if (transaction.type === CashTransactionType.WITHHOLDING_TAX && isPaymentInLieuWithholding) {
			const result: StagingTradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividends = {
				...base,
				kind: "StagingCashTransactionWithholdingTaxForPaymentInLieuOfDividends",
			};
			return result;
		}

		if (transaction.type === CashTransactionType.WITHHOLDING_TAX) {
			const result: StagingTradeEventCashTransactionWithholdingTax = {
				...base,
				kind: "StagingCashTransactionWithholdingTax",
			};
			return result;
		}

		if (transaction.type === CashTransactionType.PAYMENT_IN_LIEU_OF_DIVIDENDS) {
			const result: StagingTradeEventCashTransactionPaymentInLieuOfDividends = {
				...base,
				kind: "StagingCashTransactionPaymentInLieuOfDividends",
				dividendType,
			};
			return result;
		}

		throw new Error(`Unknown cash transaction type: ${transaction.type}`);
	});
}

function convertStockTradesToEvents(trades: TradeStock[]) {
	return trades.map((trade) => {
		const financialIdentifier = new StagingFinancialIdentifier({ isin: trade.isin, ticker: trade.symbol });
		const exchangedMoney = {
			underlyingCurrency: trade.currency,
			underlyingQuantity: trade.quantity,
			underlyingTradePrice: trade.tradePrice * trade.fxRateToBase,
			comissionCurrency: trade.ibCommissionCurrency,
			comissionTotal: trade.ibCommission * trade.fxRateToBase,
			taxCurrency: trade.currency,
			taxTotal: trade.taxes,
			fxRateToBase: trade.fxRateToBase,
		};
		const base = {
			id: trade.transactionID,
			financialIdentifier,
			assetClass: GenericAssetClass.STOCK,
			date: trade.dateTime,
			multiplier: 1,
			exchangedMoney,
		};
		if (trade.quantity > 0) {
			const result: StagingTradeEventStockAcquired = {
				...base,
				kind: "StagingStockAcquired",
				acquiredReason: GenericTradeReportItemGainType.BOUGHT,
			};
			return result;
		} else {
			const result: StagingTradeEventStockSold = {
				...base,
				kind: "StagingStockSold",
			};
			return result;
		}
	});
}

function convertStockLotsToEvents(lots: LotStock[]): StagingTaxLot[] {
	return lots.map((lot) => ({
		id: lot.transactionID,
		financialIdentifier: new StagingFinancialIdentifier({ isin: lot.isin, ticker: lot.symbol }),
		quantity: lot.quantity,
		acquired: { id: lot.transactionID, dateTime: null },
		sold: { id: null, dateTime: lot.dateTime },
		shortLongType: GenericShortLong.LONG,
	}));
}

function convertDerivativeTradesToEvents(trades: TradeDerivative[]) {
	return trades.map((trade) => {
		const financialIdentifier = new StagingFinancialIdentifier({
			isin: trade.underlyingSecurityID,
			ticker: trade.symbol,
			name: trade.description,
		});
		const exchangedMoney = {
			underlyingCurrency: trade.currency,
			underlyingQuantity: trade.quantity,
			underlyingTradePrice: trade.tradePrice * trade.fxRateToBase,
			comissionCurrency: trade.ibCommissionCurrency,
			comissionTotal: trade.ibCommission * trade.fxRateToBase,
			taxCurrency: trade.currency,
			taxTotal: trade.taxes,
			fxRateToBase: trade.fxRateToBase,
		};
		const base = {
			id: trade.transactionID,
			financialIdentifier,
			assetClass: GenericAssetClass.OPTION,
			multiplier: trade.multiplier,
			date: trade.dateTime,
			exchangedMoney,
		};
		if (trade.quantity > 0) {
			const result: StagingTradeEventDerivativeAcquired = {
				...base,
				kind: "StagingDerivativeAcquired",
				acquiredReason: GenericDerivativeReportItemGainType.BOUGHT,
			};
			return result;
		} else {
			const result: StagingTradeEventDerivativeSold = {
				...base,
				kind: "StagingDerivativeSold",
			};
			return result;
		}
	});
}

function convertDerivativeLotsToEvents(lots: LotDerivative[]): StagingTaxLot[] {
	return lots.map((lot) => ({
		id: lot.transactionID,
		financialIdentifier: new StagingFinancialIdentifier({
			isin: lot.underlyingSecurityID,
			ticker: lot.symbol,
			name: lot.description,
		}),
		quantity: lot.quantity,
		acquired: { id: lot.transactionID, dateTime: null },
		sold: { id: null, dateTime: lot.dateTime },
		shortLongType: GenericShortLong.LONG,
	}));
}

function convertCorporateActionsToPartialRelationships(
	corporateActions: CorporateAction[],
): StagingIdentifierRelationshipPartialAny[] {
	const partials: StagingIdentifierRelationshipPartialAny[] = [];

	for (const row of corporateActions) {
		const identifier = new StagingFinancialIdentifier({ isin: row.isin, ticker: row.symbol });
		const isFromSide = row.symbol.endsWith(".OLD");
		const actionType = (row.type || "").toUpperCase();

		let changeType: StagingIdentifierChangeType;
		if (actionType === "IC") {
			changeType = StagingIdentifierChangeType.RENAME;
		} else if (actionType === "FI") {
			changeType = StagingIdentifierChangeType.SPLIT;
		} else {
			changeType = StagingIdentifierChangeType.UNKNOWN;
		}

		const fromIdentifier = isFromSide ? identifier : null;
		const toIdentifier = isFromSide ? null : identifier;

		if (changeType === StagingIdentifierChangeType.SPLIT) {
			partials.push({
				fromIdentifier,
				toIdentifier,
				correlationKey: row.actionID,
				changeType,
				effectiveDate: row.dateTime,
				quantity: Math.abs(row.quantity),
			});
		} else {
			partials.push({
				fromIdentifier,
				toIdentifier,
				correlationKey: row.actionID,
				changeType,
				effectiveDate: row.dateTime,
			});
		}
	}

	return partials;
}

export function convertSegmentedTradesToGenericUnderlyingGroups(
	segmented: SegmentedTrades,
): StagingFinancialEvents {
	const stockTrades = [...segmented.stockTrades].sort((a, b) => a.isin.localeCompare(b.isin));
	const stockLots = [...segmented.stockLots].sort((a, b) => a.isin.localeCompare(b.isin));
	const derivativeTrades = [...segmented.derivativeTrades].sort((a, b) => a.underlyingSecurityID.localeCompare(b.underlyingSecurityID));
	const derivativeLots = [...segmented.derivativeLots].sort((a, b) => a.underlyingSecurityID.localeCompare(b.underlyingSecurityID));
	const cashTransactions = [...segmented.cashTransactions].sort((a, b) => a.isin.localeCompare(b.isin));

	const stockTradeEvents = convertStockTradesToEvents(stockTrades);
	const stockLotEvents = convertStockLotsToEvents(stockLots);
	const cashTransactionEvents = convertToCashTransactions(cashTransactions);
	const derivativeTradeEvents = convertDerivativeTradesToEvents(derivativeTrades);
	const derivativeLotEvents = convertDerivativeLotsToEvents(derivativeLots);

	// Group by financialIdentifier using toKey() string
	type AnyEvent = { financialIdentifier: StagingFinancialIdentifier };
	function groupByIdentifier<T extends AnyEvent>(items: T[]): Map<string, { identifier: StagingFinancialIdentifier; items: T[] }> {
		const map = new Map<string, { identifier: StagingFinancialIdentifier; items: T[] }>();
		for (const item of items) {
			const key = item.financialIdentifier.toKey();
			if (!map.has(key)) {
				map.set(key, { identifier: item.financialIdentifier, items: [] });
			}
			map.get(key)!.items.push(item);
		}
		return map;
	}

	const stocksMap = groupByIdentifier(stockTradeEvents);
	const stockLotsMap = groupByIdentifier(stockLotEvents);
	const derivativesMap = groupByIdentifier(derivativeTradeEvents);
	const derivativeLotsMap = groupByIdentifier(derivativeLotEvents);
	const dividendsMap = groupByIdentifier(cashTransactionEvents);

	// Collect all unique keys
	const allKeys = new Set([
		...stocksMap.keys(),
		...stockLotsMap.keys(),
		...derivativesMap.keys(),
		...derivativeLotsMap.keys(),
		...dividendsMap.keys(),
	]);

	const groupings: StagingFinancialGrouping[] = [];
	for (const key of allKeys) {
		const identifier = (
			stocksMap.get(key) ??
				stockLotsMap.get(key) ??
				derivativesMap.get(key) ??
				derivativeLotsMap.get(key) ??
				dividendsMap.get(key)
		)!.identifier;

		groupings.push({
			financialIdentifier: identifier,
			countryOfOrigin: null,
			underlyingCategory: GenericCategory.REGULAR,
			stockTrades: (stocksMap.get(key)?.items ?? []) as (StagingTradeEventStockAcquired | StagingTradeEventStockSold)[],
			stockTaxLots: stockLotsMap.get(key)?.items ?? [],
			derivativeTrades:
				(derivativesMap.get(key)?.items ?? []) as (StagingTradeEventDerivativeAcquired | StagingTradeEventDerivativeSold)[],
			derivativeTaxLots: derivativeLotsMap.get(key)?.items ?? [],
			cashTransactions: dividendsMap.get(key)?.items ?? [],
		});
	}

	const partials = convertCorporateActionsToPartialRelationships(segmented.corporateActions);
	const identifierRelationships: StagingIdentifierRelationships = {
		relationships: [],
		partialRelationships: partials,
	};

	return { groupings, identifierRelationships };
}
