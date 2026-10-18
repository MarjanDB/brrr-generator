import { type CashFields, type TradeFields, Values } from "@brrr/__tests__/support/Values";
import { AcquisitionMethod } from "@brrr/Core/Models/Events/AcquisitionMethod";
import type { DividendType } from "@brrr/Core/Models/Events/DividendType";
import { AssetClass } from "@brrr/Core/Models/Instrument/AssetClass";
import type { Category } from "@brrr/Core/Models/Instrument/Category";
import type { OptionContract } from "@brrr/Core/Models/Instrument/OptionContract";
import type { ShortLong } from "@brrr/Core/Models/Lots/ShortLong";
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
import type { StagingFinancialIdentifier } from "@brrr/Core/Models/Staging/Instrument/StagingFinancialIdentifier";
import { StagingTaxLot } from "@brrr/Core/Models/Staging/Lots/StagingTaxLot";
import { StagingTaxLotMatchingDetails } from "@brrr/Core/Models/Staging/Lots/StagingTaxLotMatchingDetails";

type WithIdentifier = { identifier: StagingFinancialIdentifier };

// One side of a staging lot: the trade it names by id, and the date it happened (either may be null).
type LotSide = { id: StagingTaxLotMatchingDetails["id"]; date: string | null };

// The Staging* twins of the core builders, as a broker's transform produces them. Like those, each
// builder fixes only what its name says; every other value is required.
export const StagingBuilders = {
	stockBought(fields: TradeFields & WithIdentifier): StagingTradeEventStockAcquired {
		return new StagingTradeEventStockAcquired({
			id: fields.id,
			financialIdentifier: fields.identifier,
			assetClass: AssetClass.STOCK,
			date: Values.date(fields.date),
			multiplier: 1,
			exchangedMoney: Values.tradeMoney(fields),
			acquisitionMethod: AcquisitionMethod.BOUGHT,
		});
	},

	stockSold(fields: TradeFields & WithIdentifier): StagingTradeEventStockSold {
		return new StagingTradeEventStockSold({
			id: fields.id,
			financialIdentifier: fields.identifier,
			assetClass: AssetClass.STOCK,
			date: Values.date(fields.date),
			multiplier: 1,
			exchangedMoney: Values.tradeMoney(fields),
		});
	},

	optionBought(
		fields: TradeFields & WithIdentifier & { multiplier: number; contract: OptionContract },
	): StagingTradeEventDerivativeAcquired {
		return new StagingTradeEventDerivativeAcquired({
			id: fields.id,
			financialIdentifier: fields.identifier,
			assetClass: AssetClass.OPTION,
			date: Values.date(fields.date),
			multiplier: fields.multiplier,
			exchangedMoney: Values.tradeMoney(fields),
			contract: fields.contract,
			acquisitionMethod: AcquisitionMethod.BOUGHT,
		});
	},

	optionSold(
		fields: TradeFields & WithIdentifier & { multiplier: number; contract: OptionContract },
	): StagingTradeEventDerivativeSold {
		return new StagingTradeEventDerivativeSold({
			id: fields.id,
			financialIdentifier: fields.identifier,
			assetClass: AssetClass.OPTION,
			date: Values.date(fields.date),
			multiplier: fields.multiplier,
			exchangedMoney: Values.tradeMoney(fields),
			contract: fields.contract,
		});
	},

	dividend(
		fields: CashFields & WithIdentifier & { dividendType: DividendType },
	): StagingTradeEventCashTransactionDividend {
		return new StagingTradeEventCashTransactionDividend({
			...cashEvent(fields),
			dividendType: fields.dividendType,
		});
	},

	withholdingTax(
		fields: CashFields & WithIdentifier,
	): StagingTradeEventCashTransactionWithholdingTax {
		return new StagingTradeEventCashTransactionWithholdingTax(cashEvent(fields));
	},

	paymentInLieu(
		fields: CashFields & WithIdentifier & { dividendType: DividendType },
	): StagingTradeEventCashTransactionPaymentInLieuOfDividend {
		return new StagingTradeEventCashTransactionPaymentInLieuOfDividend({
			...cashEvent(fields),
			dividendType: fields.dividendType,
		});
	},

	paymentInLieuWithholdingTax(
		fields: CashFields & WithIdentifier,
	): StagingTradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend {
		return new StagingTradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend(
			cashEvent(fields),
		);
	},

	taxLot(
		fields: {
			id: StagingTaxLot["id"];
			quantity: number;
			shortLongType: ShortLong;
			acquired: LotSide;
			sold: LotSide;
		} & WithIdentifier,
	): StagingTaxLot {
		return new StagingTaxLot({
			id: fields.id,
			financialIdentifier: fields.identifier,
			quantity: fields.quantity,
			acquired: lotSide(fields.acquired),
			sold: lotSide(fields.sold),
			shortLongType: fields.shortLongType,
		});
	},

	grouping(
		fields: {
			countryOfOrigin: StagingFinancialGrouping["countryOfOrigin"];
			category: Category;
			stockTrades: StagingTradeEventStock[];
			stockTaxLots: StagingTaxLot[];
			derivativeTrades: StagingTradeEventDerivative[];
			derivativeTaxLots: StagingTaxLot[];
			cashTransactions: StagingTradeEventCashTransaction[];
		} & WithIdentifier,
	): StagingFinancialGrouping {
		return new StagingFinancialGrouping({
			financialIdentifier: fields.identifier,
			countryOfOrigin: fields.countryOfOrigin,
			underlyingCategory: fields.category,
			stockTrades: fields.stockTrades,
			stockTaxLots: fields.stockTaxLots,
			derivativeTrades: fields.derivativeTrades,
			derivativeTaxLots: fields.derivativeTaxLots,
			cashTransactions: fields.cashTransactions,
		});
	},
};

// The fields every staging cash transaction carries.
function cashEvent(fields: CashFields & WithIdentifier) {
	return {
		id: fields.id,
		financialIdentifier: fields.identifier,
		assetClass: AssetClass.CASH_AND_CASH_EQUIVALENTS,
		date: Values.date(fields.date),
		multiplier: 1,
		exchangedMoney: Values.cashMoney(fields),
		actionId: fields.actionId,
		transactionId: fields.transactionId,
		listingExchange: fields.listingExchange,
	};
}

function lotSide(side: LotSide): StagingTaxLotMatchingDetails {
	return new StagingTaxLotMatchingDetails({
		id: side.id,
		dateTime: side.date === null ? null : Values.date(side.date),
	});
}
