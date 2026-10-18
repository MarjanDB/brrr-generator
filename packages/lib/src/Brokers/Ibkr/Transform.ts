import {
	type CorporateAction,
	IbkrCashTransactionType,
	type LotDerivative,
	type LotStock,
	type TradeDerivative,
	type TradeStock,
	type TransactionCash,
} from "@brrr/Brokers/Ibkr/Schemas/IbkrSchemas";
import type { SegmentedTrades } from "@brrr/Brokers/Ibkr/Schemas/SegmentedTrades";
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
	CashActionId,
	CashTransactionId,
	CorrelationKey,
	CurrencyCode,
	type FinancialIdentifierKey,
	Isin,
	ListingExchange,
	TaxLotId,
	Ticker,
	TradeEventId,
} from "@brrr/Core/Schemas/Identifiers";
import {
	type StagingTradeEventCashTransaction,
	StagingTradeEventCashTransactionDividend,
	StagingTradeEventCashTransactionPaymentInLieuOfDividend,
	StagingTradeEventCashTransactionWithholdingTax,
	StagingTradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend,
	type StagingTradeEventDerivative,
	StagingTradeEventDerivativeAcquired,
	StagingTradeEventDerivativeSold,
	type StagingTradeEventStock,
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
			a.underlyingSecurityID.localeCompare(b.underlyingSecurityID),
		);
		const derivativeLots = [...segmented.derivativeLots].sort((a, b) =>
			a.underlyingSecurityID.localeCompare(b.underlyingSecurityID),
		);
		const cashTransactions = [...segmented.cashTransactions].sort((a, b) =>
			a.isin.localeCompare(b.isin),
		);

		const stockTradeEvents = this.convertStockTradesToEvents(stockTrades);
		const stockLotEvents = this.convertStockLotsToEvents(stockLots);
		const cashTransactionEvents = this.convertToCashTransactions(cashTransactions);
		const derivativeTradeEvents = this.convertDerivativeTradesToEvents(derivativeTrades);
		const derivativeLotEvents = this.convertDerivativeLotsToEvents(derivativeLots);

		const groupByIdentifier = <T extends AnyEvent>(
			items: T[],
		): Map<FinancialIdentifierKey, { identifier: StagingFinancialIdentifier; items: T[] }> => {
			const map = new Map<
				FinancialIdentifierKey,
				{ identifier: StagingFinancialIdentifier; items: T[] }
			>();
			for (const item of items) {
				const key = item.financialIdentifier.toKey();
				if (!map.has(key)) {
					map.set(key, { identifier: item.financialIdentifier, items: [] });
				}
				// biome-ignore lint/style/noNonNullAssertion: key was just set above if absent
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
			// biome-ignore lint/style/noNonNullAssertion: key is guaranteed to exist in at least one map since it came from their union
			const identifier = (stocksMap.get(key) ??
				stockLotsMap.get(key) ??
				derivativesMap.get(key) ??
				derivativeLotsMap.get(key) ??
				dividendsMap.get(key))!.identifier;

			groupings.push(
				new StagingFinancialGrouping({
					financialIdentifier: identifier,
					countryOfOrigin: null,
					underlyingCategory: GenericCategory.REGULAR,
					stockTrades: stocksMap.get(key)?.items ?? [],
					stockTaxLots: stockLotsMap.get(key)?.items ?? [],
					derivativeTrades: derivativesMap.get(key)?.items ?? [],
					derivativeTaxLots: derivativeLotsMap.get(key)?.items ?? [],
					cashTransactions: dividendsMap.get(key)?.items ?? [],
				}),
			);
		}

		const partials = this.convertCorporateActionsToPartialRelationships(segmented.corporateActions);
		const identifierRelationships = new StagingIdentifierRelationships({
			relationships: [],
			partialRelationships: partials,
		});

		return new StagingFinancialEvents({ groupings, identifierRelationships });
	}

	private convertToCashTransactions(
		cashTransactions: TransactionCash[],
	): StagingTradeEventCashTransaction[] {
		return cashTransactions.map((transaction) => {
			const descLower = transaction.description.toLowerCase();
			const isOrdinaryDividend = descLower.includes("ordinary dividend");
			const isBonusDividend = descLower.includes("bonus dividend");
			const isPaymentInLieuWithholding = descLower.includes("payment in lieu of dividend");

			let dividendType = GenericDividendType.UNKNOWN;
			if (isOrdinaryDividend) dividendType = GenericDividendType.ORDINARY;
			if (isBonusDividend) dividendType = GenericDividendType.BONUS;

			const financialIdentifier = new StagingFinancialIdentifier({
				isin: Isin.Schema.parse(transaction.isin),
				ticker: Ticker.Schema.parse(transaction.symbol),
			});
			const currency = CurrencyCode.Schema.parse(transaction.currency);
			const exchangedMoney = new GenericMonetaryExchangeInformation({
				underlyingQuantity: 1,
				underlyingTradePrice: transaction.amount * transaction.fxRateToBase,
				underlyingCurrency: currency,
				commissionCurrency: currency,
				commissionTotal: 0,
				taxCurrency: currency,
				taxTotal: 0,
				fxRateToBase: transaction.fxRateToBase,
			});
			const base = {
				id: TradeEventId.Schema.parse(transaction.transactionID),
				financialIdentifier,
				assetClass: GenericAssetClass.CASH_AND_CASH_EQUIVALENTS,
				date: transaction.dateTime,
				multiplier: 1,
				exchangedMoney,
				actionId: CashActionId.Schema.parse(transaction.actionID),
				transactionId: CashTransactionId.Schema.parse(transaction.transactionID),
				listingExchange: ListingExchange.Schema.parse(transaction.listingExchange),
			};

			if (transaction.type === IbkrCashTransactionType.DIVIDEND) {
				return new StagingTradeEventCashTransactionDividend({ ...base, dividendType });
			}

			if (
				transaction.type === IbkrCashTransactionType.WITHHOLDING_TAX &&
				isPaymentInLieuWithholding
			) {
				return new StagingTradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend(base);
			}

			if (transaction.type === IbkrCashTransactionType.WITHHOLDING_TAX) {
				return new StagingTradeEventCashTransactionWithholdingTax(base);
			}

			if (transaction.type === IbkrCashTransactionType.PAYMENT_IN_LIEU_OF_DIVIDENDS) {
				return new StagingTradeEventCashTransactionPaymentInLieuOfDividend({
					...base,
					dividendType,
				});
			}

			throw new Error(`Unknown cash transaction type: ${transaction.type}`);
		});
	}

	private convertStockTradesToEvents(trades: TradeStock[]): StagingTradeEventStock[] {
		return trades.map((trade) => {
			const financialIdentifier = new StagingFinancialIdentifier({
				isin: Isin.Schema.parse(trade.isin),
				ticker: Ticker.Schema.parse(trade.symbol),
			});
			const exchangedMoney = new GenericMonetaryExchangeInformation({
				underlyingCurrency: CurrencyCode.Schema.parse(trade.currency),
				underlyingQuantity: trade.quantity,
				underlyingTradePrice: trade.tradePrice * trade.fxRateToBase,
				commissionCurrency: CurrencyCode.Schema.parse(trade.ibCommissionCurrency),
				commissionTotal: trade.ibCommission * trade.fxRateToBase,
				taxCurrency: CurrencyCode.Schema.parse(trade.currency), // NOTE: Taxes Currency == Trade Currency ??
				taxTotal: trade.taxes,
				fxRateToBase: trade.fxRateToBase,
			});
			const base = {
				id: TradeEventId.Schema.parse(trade.transactionID),
				financialIdentifier,
				assetClass: GenericAssetClass.STOCK,
				date: trade.dateTime,
				multiplier: 1,
				exchangedMoney,
			};
			if (trade.quantity > 0) {
				return new StagingTradeEventStockAcquired({
					...base,
					acquiredReason: GenericTradeReportItemGainType.BOUGHT,
				});
			} else {
				return new StagingTradeEventStockSold(base);
			}
		});
	}

	private convertStockLotsToEvents(lots: LotStock[]): StagingTaxLot[] {
		return lots.map(
			(lot) =>
				new StagingTaxLot({
					id: TaxLotId.Schema.parse(lot.transactionID),
					financialIdentifier: new StagingFinancialIdentifier({
						isin: Isin.Schema.parse(lot.isin),
						ticker: Ticker.Schema.parse(lot.symbol),
					}),
					quantity: lot.quantity,
					acquired: new StagingTaxLotMatchingDetails({
						id: TradeEventId.Schema.parse(lot.transactionID),
						dateTime: null,
					}),
					sold: new StagingTaxLotMatchingDetails({ id: null, dateTime: lot.dateTime }),
					shortLongType: GenericShortLong.LONG,
				}),
		);
	}

	private convertDerivativeTradesToEvents(
		trades: TradeDerivative[],
	): StagingTradeEventDerivative[] {
		return trades.map((trade) => {
			const financialIdentifier = new StagingFinancialIdentifier({
				isin: Isin.Schema.parse(trade.underlyingSecurityID),
				ticker: Ticker.Schema.parse(trade.symbol),
				name: trade.description,
			});
			const exchangedMoney = new GenericMonetaryExchangeInformation({
				underlyingCurrency: CurrencyCode.Schema.parse(trade.currency),
				underlyingQuantity: trade.quantity,
				underlyingTradePrice: trade.tradePrice * trade.fxRateToBase,
				commissionCurrency: CurrencyCode.Schema.parse(trade.ibCommissionCurrency),
				commissionTotal: trade.ibCommission * trade.fxRateToBase,
				taxCurrency: CurrencyCode.Schema.parse(trade.currency), // NOTE: Taxes Currency == Trade Currency ??
				taxTotal: trade.taxes,
				fxRateToBase: trade.fxRateToBase,
			});
			const base = {
				id: TradeEventId.Schema.parse(trade.transactionID),
				financialIdentifier,
				assetClass: GenericAssetClass.OPTION,
				multiplier: trade.multiplier,
				date: trade.dateTime,
				exchangedMoney,
			};
			if (trade.quantity > 0) {
				return new StagingTradeEventDerivativeAcquired({
					...base,
					acquiredReason: GenericDerivativeReportItemGainType.BOUGHT,
				});
			} else {
				return new StagingTradeEventDerivativeSold(base);
			}
		});
	}

	private convertDerivativeLotsToEvents(lots: LotDerivative[]): StagingTaxLot[] {
		return lots.map(
			(lot) =>
				new StagingTaxLot({
					id: TaxLotId.Schema.parse(lot.transactionID),
					financialIdentifier: new StagingFinancialIdentifier({
						isin: Isin.Schema.parse(lot.underlyingSecurityID),
						ticker: Ticker.Schema.parse(lot.symbol),
						name: lot.description,
					}),
					quantity: lot.quantity,
					acquired: new StagingTaxLotMatchingDetails({
						id: TradeEventId.Schema.parse(lot.transactionID),
						dateTime: null,
					}),
					sold: new StagingTaxLotMatchingDetails({ id: null, dateTime: lot.dateTime }),
					shortLongType: GenericShortLong.LONG,
				}),
		);
	}

	private convertCorporateActionsToPartialRelationships(
		corporateActions: CorporateAction[],
	): StagingIdentifierRelationshipPartialAny[] {
		const partials: StagingIdentifierRelationshipPartialAny[] = [];

		for (const row of corporateActions) {
			const identifier = new StagingFinancialIdentifier({
				isin: Isin.Schema.parse(row.isin),
				ticker: Ticker.Schema.parse(row.symbol),
			});
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
						correlationKey: CorrelationKey.Schema.parse(row.actionID),
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
						correlationKey: CorrelationKey.Schema.parse(row.actionID),
						changeType,
						effectiveDate: row.dateTime,
					}),
				);
			}
		}

		return partials;
	}
}
