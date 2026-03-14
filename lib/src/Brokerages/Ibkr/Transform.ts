import {
	CashTransactionType,
	type CorporateAction,
	type LotDerivative,
	type LotStock,
	type TradeDerivative,
	type TradeStock,
	type TransactionCash,
} from "@brrr/Brokerages/Ibkr/Schemas/IbkrSchemas";
import type { SegmentedTrades } from "@brrr/Brokerages/Ibkr/Schemas/SegmentedTrades";
import {
	GenericAssetClass,
	GenericCategory,
	GenericDerivativeReportItemGainType,
	GenericDividendType,
	GenericMonetaryExchangeInformation,
	GenericShortLong,
	GenericTradeReportItemGainType,
} from "@brrr/Core/Schemas/CommonFormats";
import {
	StagingTradeEventCashTransactionDividend,
	StagingTradeEventCashTransactionPaymentInLieuOfDividends,
	StagingTradeEventCashTransactionWithholdingTax,
	StagingTradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividends,
	StagingTradeEventDerivativeAcquired,
	StagingTradeEventDerivativeSold,
	StagingTradeEventStockAcquired,
	StagingTradeEventStockSold,
} from "@brrr/Core/Schemas/Staging/Events";
import { StagingFinancialGrouping } from "@brrr/Core/Schemas/Staging/Grouping";
import {
	StagingIdentifierChangeType,
	StagingIdentifierRelationshipPartial,
	type StagingIdentifierRelationshipPartialAny,
	StagingIdentifierRelationshipPartialWithQuantity,
	StagingIdentifierRelationships,
} from "@brrr/Core/Schemas/Staging/IdentifierRelationship";
import { StagingTaxLot, StagingTaxLotMatchingDetails } from "@brrr/Core/Schemas/Staging/Lots";
import { StagingFinancialEvents } from "@brrr/Core/Schemas/Staging/StagingFinancialEvents";
import { StagingFinancialIdentifier } from "@brrr/Core/Schemas/Staging/StagingFinancialIdentifier";

type AnyEvent = { financialIdentifier: StagingFinancialIdentifier };

export class IbkrTransformService {
	public convertSegmentedTradesToStagingEvents(segmented: SegmentedTrades): StagingFinancialEvents {
		const stockTrades = [...segmented.stockTrades].sort((a, b) => a.isin.localeCompare(b.isin));
		const stockLots = [...segmented.stockLots].sort((a, b) => a.isin.localeCompare(b.isin));
		const derivativeTrades = [...segmented.derivativeTrades].sort((a, b) =>
			a.underlyingSecurityID.localeCompare(b.underlyingSecurityID)
		);
		const derivativeLots = [...segmented.derivativeLots].sort((a, b) => a.underlyingSecurityID.localeCompare(b.underlyingSecurityID));
		const cashTransactions = [...segmented.cashTransactions].sort((a, b) => a.isin.localeCompare(b.isin));

		const stockTradeEvents = this._convertStockTradesToEvents(stockTrades);
		const stockLotEvents = this._convertStockLotsToEvents(stockLots);
		const cashTransactionEvents = this._convertToCashTransactions(cashTransactions);
		const derivativeTradeEvents = this._convertDerivativeTradesToEvents(derivativeTrades);
		const derivativeLotEvents = this._convertDerivativeLotsToEvents(derivativeLots);

		const groupByIdentifier = <T extends AnyEvent>(items: T[]): Map<string, { identifier: StagingFinancialIdentifier; items: T[] }> => {
			const map = new Map<string, { identifier: StagingFinancialIdentifier; items: T[] }>();
			for (const item of items) {
				const key = item.financialIdentifier.toKey();
				if (!map.has(key)) {
					map.set(key, { identifier: item.financialIdentifier, items: [] });
				}
				map.get(key)!.items.push(item);
			}
			return map;
		};

		const stocksMap = groupByIdentifier(stockTradeEvents);
		const stockLotsMap = groupByIdentifier(stockLotEvents);
		const derivativesMap = groupByIdentifier(derivativeTradeEvents);
		const derivativeLotsMap = groupByIdentifier(derivativeLotEvents);
		const dividendsMap = groupByIdentifier(cashTransactionEvents);

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

			groupings.push(
				new StagingFinancialGrouping({
					financialIdentifier: identifier,
					countryOfOrigin: null,
					underlyingCategory: GenericCategory.REGULAR,
					stockTrades: (stocksMap.get(key)?.items ?? []) as (StagingTradeEventStockAcquired | StagingTradeEventStockSold)[],
					stockTaxLots: stockLotsMap.get(key)?.items ?? [],
					derivativeTrades:
						(derivativesMap.get(key)?.items ?? []) as (StagingTradeEventDerivativeAcquired | StagingTradeEventDerivativeSold)[],
					derivativeTaxLots: derivativeLotsMap.get(key)?.items ?? [],
					cashTransactions: dividendsMap.get(key)?.items ?? [],
				}),
			);
		}

		const partials = this._convertCorporateActionsToPartialRelationships(segmented.corporateActions);
		const identifierRelationships = new StagingIdentifierRelationships({
			relationships: [],
			partialRelationships: partials,
		});

		return new StagingFinancialEvents({ groupings, identifierRelationships });
	}

	private _convertToCashTransactions(cashTransactions: TransactionCash[]) {
		return cashTransactions.map((transaction) => {
			const descLower = transaction.description.toLowerCase();
			const isOrdinaryDividend = descLower.includes("ordinary dividend");
			const isBonusDividend = descLower.includes("bonus dividend");
			const isPaymentInLieuWithholding = descLower.includes("payment in lieu of dividend");

			let dividendType = GenericDividendType.UNKNOWN;
			if (isOrdinaryDividend) dividendType = GenericDividendType.ORDINARY;
			if (isBonusDividend) dividendType = GenericDividendType.BONUS;

			const financialIdentifier = new StagingFinancialIdentifier({ isin: transaction.isin, ticker: transaction.symbol });
			const exchangedMoney = new GenericMonetaryExchangeInformation({
				underlyingQuantity: 1,
				underlyingTradePrice: transaction.amount * transaction.fxRateToBase,
				underlyingCurrency: transaction.currency,
				comissionCurrency: transaction.currency,
				comissionTotal: 0,
				taxCurrency: transaction.currency,
				taxTotal: 0,
				fxRateToBase: transaction.fxRateToBase,
			});
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
				return new StagingTradeEventCashTransactionDividend({ ...base, dividendType });
			}

			if (transaction.type === CashTransactionType.WITHHOLDING_TAX && isPaymentInLieuWithholding) {
				return new StagingTradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividends(base);
			}

			if (transaction.type === CashTransactionType.WITHHOLDING_TAX) {
				return new StagingTradeEventCashTransactionWithholdingTax(base);
			}

			if (transaction.type === CashTransactionType.PAYMENT_IN_LIEU_OF_DIVIDENDS) {
				return new StagingTradeEventCashTransactionPaymentInLieuOfDividends({ ...base, dividendType });
			}

			throw new Error(`Unknown cash transaction type: ${transaction.type}`);
		});
	}

	private _convertStockTradesToEvents(trades: TradeStock[]) {
		return trades.map((trade) => {
			const financialIdentifier = new StagingFinancialIdentifier({ isin: trade.isin, ticker: trade.symbol });
			const exchangedMoney = new GenericMonetaryExchangeInformation({
				underlyingCurrency: trade.currency,
				underlyingQuantity: trade.quantity,
				underlyingTradePrice: trade.tradePrice * trade.fxRateToBase,
				comissionCurrency: trade.ibCommissionCurrency,
				comissionTotal: trade.ibCommission * trade.fxRateToBase,
				taxCurrency: trade.currency, // NOTE: Taxes Currency == Trade Currency ??
				taxTotal: trade.taxes,
				fxRateToBase: trade.fxRateToBase,
			});
			const base = {
				id: trade.transactionID,
				financialIdentifier,
				assetClass: GenericAssetClass.STOCK,
				date: trade.dateTime,
				multiplier: 1,
				exchangedMoney,
			};
			if (trade.quantity > 0) {
				return new StagingTradeEventStockAcquired({ ...base, acquiredReason: GenericTradeReportItemGainType.BOUGHT });
			} else {
				return new StagingTradeEventStockSold(base);
			}
		});
	}

	private _convertStockLotsToEvents(lots: LotStock[]): StagingTaxLot[] {
		return lots.map((lot) =>
			new StagingTaxLot({
				id: lot.transactionID,
				financialIdentifier: new StagingFinancialIdentifier({ isin: lot.isin, ticker: lot.symbol }),
				quantity: lot.quantity,
				acquired: new StagingTaxLotMatchingDetails({ id: lot.transactionID, dateTime: null }),
				sold: new StagingTaxLotMatchingDetails({ id: null, dateTime: lot.dateTime }),
				shortLongType: GenericShortLong.LONG,
			})
		);
	}

	private _convertDerivativeTradesToEvents(trades: TradeDerivative[]) {
		return trades.map((trade) => {
			const financialIdentifier = new StagingFinancialIdentifier({
				isin: trade.underlyingSecurityID,
				ticker: trade.symbol,
				name: trade.description,
			});
			const exchangedMoney = new GenericMonetaryExchangeInformation({
				underlyingCurrency: trade.currency,
				underlyingQuantity: trade.quantity,
				underlyingTradePrice: trade.tradePrice * trade.fxRateToBase,
				comissionCurrency: trade.ibCommissionCurrency,
				comissionTotal: trade.ibCommission * trade.fxRateToBase,
				taxCurrency: trade.currency, // NOTE: Taxes Currency == Trade Currency ??
				taxTotal: trade.taxes,
				fxRateToBase: trade.fxRateToBase,
			});
			const base = {
				id: trade.transactionID,
				financialIdentifier,
				assetClass: GenericAssetClass.OPTION,
				multiplier: trade.multiplier,
				date: trade.dateTime,
				exchangedMoney,
			};
			if (trade.quantity > 0) {
				return new StagingTradeEventDerivativeAcquired({ ...base, acquiredReason: GenericDerivativeReportItemGainType.BOUGHT });
			} else {
				return new StagingTradeEventDerivativeSold(base);
			}
		});
	}

	private _convertDerivativeLotsToEvents(lots: LotDerivative[]): StagingTaxLot[] {
		return lots.map((lot) =>
			new StagingTaxLot({
				id: lot.transactionID,
				financialIdentifier: new StagingFinancialIdentifier({
					isin: lot.underlyingSecurityID,
					ticker: lot.symbol,
					name: lot.description,
				}),
				quantity: lot.quantity,
				acquired: new StagingTaxLotMatchingDetails({ id: lot.transactionID, dateTime: null }),
				sold: new StagingTaxLotMatchingDetails({ id: null, dateTime: lot.dateTime }),
				shortLongType: GenericShortLong.LONG,
			})
		);
	}

	private _convertCorporateActionsToPartialRelationships(corporateActions: CorporateAction[]): StagingIdentifierRelationshipPartialAny[] {
		const partials: StagingIdentifierRelationshipPartialAny[] = [];

		for (const row of corporateActions) {
			const identifier = new StagingFinancialIdentifier({ isin: row.isin, ticker: row.symbol });
			const isFromSide = row.symbol.endsWith(".OLD");
			const actionType = (row.type || "").toUpperCase();

			let changeType: StagingIdentifierChangeType;
			// IBKR corporate action type codes: "IC" = ticker/identifier change (RENAME), "FI" = stock split (SPLIT)
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
				partials.push(
					new StagingIdentifierRelationshipPartialWithQuantity({
						fromIdentifier,
						toIdentifier,
						correlationKey: row.actionID,
						changeType,
						effectiveDate: row.dateTime,
						quantity: Math.abs(row.quantity),
					}),
				);
			} else {
				partials.push(
					new StagingIdentifierRelationshipPartial({
						fromIdentifier,
						toIdentifier,
						correlationKey: row.actionID,
						changeType,
						effectiveDate: row.dateTime,
					}),
				);
			}
		}

		return partials;
	}
}
