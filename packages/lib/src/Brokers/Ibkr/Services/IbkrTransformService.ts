import type { SegmentedTrades } from "@brrr/Brokers/Ibkr/Models/SegmentedTrades";
import type { CorporateAction } from "@brrr/Brokers/Ibkr/Schemas/CorporateAction";
import { IbkrCashTransactionType } from "@brrr/Brokers/Ibkr/Schemas/Enums/IbkrCashTransactionType";
import type { LotDerivative } from "@brrr/Brokers/Ibkr/Schemas/LotDerivative";
import type { LotStock } from "@brrr/Brokers/Ibkr/Schemas/LotStock";
import type { TradeDerivative } from "@brrr/Brokers/Ibkr/Schemas/TradeDerivative";
import type { TradeStock } from "@brrr/Brokers/Ibkr/Schemas/TradeStock";
import type { TransactionCash } from "@brrr/Brokers/Ibkr/Schemas/TransactionCash";
import { AcquisitionMethod } from "@brrr/Core/Models/Events/AcquisitionMethod";
import { DividendType } from "@brrr/Core/Models/Events/DividendType";
import { ExchangedMoney } from "@brrr/Core/Models/Events/ExchangedMoney";
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
} from "@brrr/Core/Models/Identifiers";
import { AssetClass } from "@brrr/Core/Models/Instrument/AssetClass";
import { Category } from "@brrr/Core/Models/Instrument/Category";
import { ShortLong } from "@brrr/Core/Models/Lots/ShortLong";
import type { StagingTradeEventCashTransaction } from "@brrr/Core/Models/Staging/Events/CashTransaction/StagingTradeEventCashTransaction";
import { StagingTradeEventCashTransactionDividend } from "@brrr/Core/Models/Staging/Events/CashTransaction/StagingTradeEventCashTransactionDividend";
import { StagingTradeEventCashTransactionPaymentInLieuOfDividend } from "@brrr/Core/Models/Staging/Events/CashTransaction/StagingTradeEventCashTransactionPaymentInLieuOfDividend";
import { StagingTradeEventCashTransactionWithholdingTax } from "@brrr/Core/Models/Staging/Events/CashTransaction/StagingTradeEventCashTransactionWithholdingTax";
import { StagingTradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend } from "@brrr/Core/Models/Staging/Events/CashTransaction/StagingTradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend";
import type { StagingTradeEventDerivative } from "@brrr/Core/Models/Staging/Events/Derivative/StagingTradeEventDerivative";
import { StagingTradeEventDerivativeAcquired } from "@brrr/Core/Models/Staging/Events/Derivative/StagingTradeEventDerivativeAcquired";
import { StagingTradeEventDerivativeSold } from "@brrr/Core/Models/Staging/Events/Derivative/StagingTradeEventDerivativeSold";
import type { StagingTradeEventStock } from "@brrr/Core/Models/Staging/Events/Stock/StagingTradeEventStock";
import { StagingTradeEventStockAcquired } from "@brrr/Core/Models/Staging/Events/Stock/StagingTradeEventStockAcquired";
import { StagingTradeEventStockSold } from "@brrr/Core/Models/Staging/Events/Stock/StagingTradeEventStockSold";
import { StagingFinancialGrouping } from "@brrr/Core/Models/Staging/Groupings/StagingFinancialGrouping";
import { StagingIdentifierChangeType } from "@brrr/Core/Models/Staging/IdentifierRelationships/StagingIdentifierChangeType";
import { StagingIdentifierRelationshipPartial } from "@brrr/Core/Models/Staging/IdentifierRelationships/StagingIdentifierRelationshipPartial";
import type { StagingIdentifierRelationshipPartialAny } from "@brrr/Core/Models/Staging/IdentifierRelationships/StagingIdentifierRelationshipPartialAny";
import { StagingIdentifierRelationshipPartialWithQuantity } from "@brrr/Core/Models/Staging/IdentifierRelationships/StagingIdentifierRelationshipPartialWithQuantity";
import { StagingIdentifierRelationships } from "@brrr/Core/Models/Staging/IdentifierRelationships/StagingIdentifierRelationships";
import { StagingFinancialIdentifier } from "@brrr/Core/Models/Staging/Instrument/StagingFinancialIdentifier";
import { StagingTaxLot } from "@brrr/Core/Models/Staging/Lots/StagingTaxLot";
import { StagingTaxLotMatchingDetails } from "@brrr/Core/Models/Staging/Lots/StagingTaxLotMatchingDetails";
import { StagingFinancialEvents } from "@brrr/Core/Models/Staging/StagingFinancialEvents";

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
					underlyingCategory: Category.REGULAR,
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

			let dividendType = DividendType.UNKNOWN;
			if (isOrdinaryDividend) dividendType = DividendType.ORDINARY;
			if (isBonusDividend) dividendType = DividendType.BONUS;

			const financialIdentifier = new StagingFinancialIdentifier({
				isin: Isin.Schema.parse(transaction.isin),
				ticker: Ticker.Schema.parse(transaction.symbol),
			});
			const currency = CurrencyCode.Schema.parse(transaction.currency);
			const exchangedMoney = new ExchangedMoney({
				quantity: 1,
				priceInBase: transaction.amount * transaction.fxRateToBase,
				currency: currency,
				commissionCurrency: currency,
				commissionInBase: 0,
				taxCurrency: currency,
				taxTotal: 0,
				fxRateToBase: transaction.fxRateToBase,
			});
			const base = {
				id: TradeEventId.Schema.parse(transaction.transactionID),
				financialIdentifier,
				assetClass: AssetClass.CASH_AND_CASH_EQUIVALENTS,
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
			const exchangedMoney = new ExchangedMoney({
				currency: CurrencyCode.Schema.parse(trade.currency),
				quantity: trade.quantity,
				priceInBase: trade.tradePrice * trade.fxRateToBase,
				commissionCurrency: CurrencyCode.Schema.parse(trade.ibCommissionCurrency),
				commissionInBase: trade.ibCommission * trade.fxRateToBase,
				taxCurrency: CurrencyCode.Schema.parse(trade.currency), // NOTE: Taxes Currency == Trade Currency ??
				taxTotal: trade.taxes,
				fxRateToBase: trade.fxRateToBase,
			});
			const base = {
				id: TradeEventId.Schema.parse(trade.transactionID),
				financialIdentifier,
				assetClass: AssetClass.STOCK,
				date: trade.dateTime,
				multiplier: 1,
				exchangedMoney,
			};
			if (trade.quantity > 0) {
				return new StagingTradeEventStockAcquired({
					...base,
					acquisitionMethod: AcquisitionMethod.BOUGHT,
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
					shortLongType: ShortLong.LONG,
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
			const exchangedMoney = new ExchangedMoney({
				currency: CurrencyCode.Schema.parse(trade.currency),
				quantity: trade.quantity,
				priceInBase: trade.tradePrice * trade.fxRateToBase,
				commissionCurrency: CurrencyCode.Schema.parse(trade.ibCommissionCurrency),
				commissionInBase: trade.ibCommission * trade.fxRateToBase,
				taxCurrency: CurrencyCode.Schema.parse(trade.currency), // NOTE: Taxes Currency == Trade Currency ??
				taxTotal: trade.taxes,
				fxRateToBase: trade.fxRateToBase,
			});
			const base = {
				id: TradeEventId.Schema.parse(trade.transactionID),
				financialIdentifier,
				assetClass: AssetClass.OPTION,
				multiplier: trade.multiplier,
				date: trade.dateTime,
				exchangedMoney,
			};
			if (trade.quantity > 0) {
				return new StagingTradeEventDerivativeAcquired({
					...base,
					acquisitionMethod: AcquisitionMethod.BOUGHT,
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
					shortLongType: ShortLong.LONG,
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
