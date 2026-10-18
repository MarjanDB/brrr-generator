import { StagingBuilders } from "@brrr/__tests__/support/StagingBuilders";
import { type CashFields, type TradeFields, Values } from "@brrr/__tests__/support/Values";
import { SegmentedTrades } from "@brrr/Brokers/Ibkr/Models/SegmentedTrades";
import type { ImportFile } from "@brrr/Brokers/Models/ImportFile";
import { createContainer } from "@brrr/Container";
import { AcquisitionMethod } from "@brrr/Core/Models/Events/AcquisitionMethod";
import type { TradeEventCashTransaction } from "@brrr/Core/Models/Events/CashTransaction/TradeEventCashTransaction";
import { TradeEventCashTransactionDividend } from "@brrr/Core/Models/Events/CashTransaction/TradeEventCashTransactionDividend";
import { TradeEventCashTransactionPaymentInLieuOfDividend } from "@brrr/Core/Models/Events/CashTransaction/TradeEventCashTransactionPaymentInLieuOfDividend";
import { TradeEventCashTransactionWithholdingTax } from "@brrr/Core/Models/Events/CashTransaction/TradeEventCashTransactionWithholdingTax";
import { TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend } from "@brrr/Core/Models/Events/CashTransaction/TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend";
import type { TradeEventDerivative } from "@brrr/Core/Models/Events/Derivative/TradeEventDerivative";
import { TradeEventDerivativeAcquired } from "@brrr/Core/Models/Events/Derivative/TradeEventDerivativeAcquired";
import { TradeEventDerivativeSold } from "@brrr/Core/Models/Events/Derivative/TradeEventDerivativeSold";
import type { DividendType } from "@brrr/Core/Models/Events/DividendType";
import type { TradeEventStock } from "@brrr/Core/Models/Events/Stock/TradeEventStock";
import { TradeEventStockAcquired } from "@brrr/Core/Models/Events/Stock/TradeEventStockAcquired";
import { TradeEventStockSold } from "@brrr/Core/Models/Events/Stock/TradeEventStockSold";
import { FinancialEvents } from "@brrr/Core/Models/FinancialEvents";
import { DerivativeGrouping } from "@brrr/Core/Models/Groupings/DerivativeGrouping";
import { FinancialGrouping } from "@brrr/Core/Models/Groupings/FinancialGrouping";
import type { IdentifierRelationshipAny } from "@brrr/Core/Models/IdentifierRelationships/IdentifierRelationshipAny";
import { AssetClass } from "@brrr/Core/Models/Instrument/AssetClass";
import type { Category } from "@brrr/Core/Models/Instrument/Category";
import type { FinancialIdentifier } from "@brrr/Core/Models/Instrument/FinancialIdentifier";
import type { ShortLong } from "@brrr/Core/Models/Lots/ShortLong";
import { TaxLot, type TaxLotDerivative, type TaxLotStock } from "@brrr/Core/Models/Lots/TaxLot";
import { FinancialEventsProcessor } from "@brrr/Core/Services/LotMatching/FinancialEventsProcessor";
import { LotMatcher } from "@brrr/Core/Services/LotMatching/LotMatcher";
import type { IInfoProvider } from "@brrr/InfoProviders/Interfaces/IInfoProvider";
import type { CompanyInfo } from "@brrr/InfoProviders/Models/CompanyInfo";
import type { Country } from "@brrr/InfoProviders/Models/Country";
import { PredefinedInfoProvider } from "@brrr/InfoProviders/Predefined/PredefinedInfoProvider";
import {
	type ImportResult,
	ReportPipeline,
	type ReportResult,
} from "@brrr/Pipeline/ReportPipeline";
import type { TaxAuthorityConfiguration } from "@brrr/TaxAuthorities/Models/TaxAuthorityConfiguration";
import { TaxAuthorityId } from "@brrr/TaxAuthorities/Models/TaxAuthorityIdentifiers";
import type { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/Models/TaxAuthorityLotMatchingMethod";
import type { TaxpayerInfo } from "@brrr/TaxAuthorities/Schemas/TaxpayerConfigSchema";
import type { SlovenianReportTypeId } from "@brrr/TaxAuthorities/Slovenia/Models/SlovenianReportTypeId";

type LotFields = { id: TaxLotStock["id"]; quantity: number; shortLongType: ShortLong };

// Builders for lib's objects. Each fixes only what its name says (a stock buy is a STOCK bought
// with multiplier 1); every other value is required.
const build = {
	date: Values.date,

	stockBought(fields: TradeFields): TradeEventStockAcquired {
		return new TradeEventStockAcquired({
			id: fields.id,
			assetClass: AssetClass.STOCK,
			date: Values.date(fields.date),
			multiplier: 1,
			exchangedMoney: Values.tradeMoney(fields),
			acquisitionMethod: AcquisitionMethod.BOUGHT,
		});
	},

	stockSold(fields: TradeFields): TradeEventStockSold {
		return new TradeEventStockSold({
			id: fields.id,
			assetClass: AssetClass.STOCK,
			date: Values.date(fields.date),
			multiplier: 1,
			exchangedMoney: Values.tradeMoney(fields),
		});
	},

	optionBought(fields: TradeFields & { multiplier: number }): TradeEventDerivativeAcquired {
		return new TradeEventDerivativeAcquired({
			id: fields.id,
			assetClass: AssetClass.OPTION,
			date: Values.date(fields.date),
			multiplier: fields.multiplier,
			exchangedMoney: Values.tradeMoney(fields),
			acquisitionMethod: AcquisitionMethod.BOUGHT,
		});
	},

	optionSold(fields: TradeFields & { multiplier: number }): TradeEventDerivativeSold {
		return new TradeEventDerivativeSold({
			id: fields.id,
			assetClass: AssetClass.OPTION,
			date: Values.date(fields.date),
			multiplier: fields.multiplier,
			exchangedMoney: Values.tradeMoney(fields),
		});
	},

	dividend(fields: CashFields & { dividendType: DividendType }): TradeEventCashTransactionDividend {
		return new TradeEventCashTransactionDividend({
			...cashEvent(fields),
			dividendType: fields.dividendType,
		});
	},

	withholdingTax(fields: CashFields): TradeEventCashTransactionWithholdingTax {
		return new TradeEventCashTransactionWithholdingTax(cashEvent(fields));
	},

	paymentInLieu(
		fields: CashFields & { dividendType: DividendType },
	): TradeEventCashTransactionPaymentInLieuOfDividend {
		return new TradeEventCashTransactionPaymentInLieuOfDividend({
			...cashEvent(fields),
			dividendType: fields.dividendType,
		});
	},

	paymentInLieuWithholdingTax(
		fields: CashFields,
	): TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend {
		return new TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend(cashEvent(fields));
	},

	stockTaxLot(
		fields: LotFields & { acquired: TradeEventStockAcquired; sold: TradeEventStockSold },
	): TaxLotStock {
		return new TaxLot(fields);
	},

	derivativeTaxLot(
		fields: LotFields & { acquired: TradeEventDerivativeAcquired; sold: TradeEventDerivativeSold },
	): TaxLotDerivative {
		return new TaxLot(fields);
	},

	derivativeGrouping(fields: {
		identifier: FinancialIdentifier;
		trades: TradeEventDerivative[];
		taxLots: TaxLotDerivative[];
	}): DerivativeGrouping {
		return new DerivativeGrouping({
			financialIdentifier: fields.identifier,
			derivativeTrades: fields.trades,
			derivativeTaxLots: fields.taxLots,
		});
	},

	grouping(fields: {
		identifier: FinancialIdentifier;
		countryOfOrigin: FinancialGrouping["countryOfOrigin"];
		category: Category;
		stockTrades: TradeEventStock[];
		stockTaxLots: TaxLotStock[];
		derivativeGroupings: DerivativeGrouping[];
		cashTransactions: TradeEventCashTransaction[];
	}): FinancialGrouping {
		return new FinancialGrouping({
			financialIdentifier: fields.identifier,
			countryOfOrigin: fields.countryOfOrigin,
			underlyingCategory: fields.category,
			stockTrades: fields.stockTrades,
			stockTaxLots: fields.stockTaxLots,
			derivativeGroupings: fields.derivativeGroupings,
			cashTransactions: fields.cashTransactions,
		});
	},

	events(
		groupings: FinancialGrouping[],
		identifierRelationships: IdentifierRelationshipAny[],
	): FinancialEvents {
		return new FinancialEvents({ groupings, identifierRelationships });
	},

	staging: StagingBuilders,

	ibkr: {
		// What the extract step hands the transform step; every row list is required.
		segmentedTrades(rows: ConstructorParameters<typeof SegmentedTrades>[0]): SegmentedTrades {
			return new SegmentedTrades(rows);
		},
	},
};

// The fields every cash transaction carries.
function cashEvent(fields: CashFields) {
	return {
		id: fields.id,
		assetClass: AssetClass.CASH_AND_CASH_EQUIVALENTS,
		date: Values.date(fields.date),
		multiplier: 1,
		exchangedMoney: Values.cashMoney(fields),
		actionId: fields.actionId,
		transactionId: fields.transactionId,
		listingExchange: fields.listingExchange,
	};
}

const config = {
	// The calendar year: from January 1st to the next January 1st.
	report(
		year: number,
		lotMatchingMethod: TaxAuthorityLotMatchingMethod,
	): TaxAuthorityConfiguration {
		return {
			fromDate: Values.date(`${year}-01-01`),
			toDate: Values.date(`${year + 1}-01-01`),
			lotMatchingMethod,
		};
	},

	infoProvider(lookups: {
		companies: Record<string, CompanyInfo>;
		countries: Record<string, Country>;
	}): PredefinedInfoProvider {
		const info = new PredefinedInfoProvider();
		for (const [isin, company] of Object.entries(lookups.companies)) {
			info.addCompany(isin, company);
		}
		for (const [name, country] of Object.entries(lookups.countries)) {
			info.addCountry(name, country);
		}
		return info;
	},
};

const pipeline = {
	// Broker exports to the import, through the same ReportPipeline the CLI and the site use.
	run(files: ImportFile[]): ImportResult {
		const imported = createContainer(new PredefinedInfoProvider()).get(ReportPipeline).read(files);

		const unread = imported.detections.filter((d) => d.error !== null || d.detectedBroker === null);
		if (unread.length > 0) {
			throw new Error(`Not read as a broker export: ${unread.map((d) => d.fileName).join(", ")}`);
		}

		return imported;
	},

	// One Slovenian report for a calendar year.
	async generate(
		imported: ImportResult,
		options: {
			report: SlovenianReportTypeId;
			year: number;
			lotMatching: TaxAuthorityLotMatchingMethod;
			taxpayer: TaxpayerInfo;
			info: IInfoProvider;
		},
	): Promise<ReportResult> {
		return await createContainer(options.info)
			.get(ReportPipeline)
			.generate(imported, {
				authorityId: TaxAuthorityId.SLOVENIA,
				reportTypeId: options.report,
				taxpayerInfo: options.taxpayer,
				reportConfig: config.report(options.year, options.lotMatching),
			});
	},

	eventsProcessor(): FinancialEventsProcessor {
		return new FinancialEventsProcessor(new LotMatcher());
	},
};

// Builders, configuration and the pipeline for lib's tests. Named test data lives in Fixtures.
export const Scenario = { build, config, pipeline };
