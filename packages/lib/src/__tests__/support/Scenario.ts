import { StagingBuilders } from "@brrr/__tests__/support/StagingBuilders";
import { type CashFields, type TradeFields, Values } from "@brrr/__tests__/support/Values";
import { BrokerageRegistry } from "@brrr/Brokerages/BrokerageRegistry";
import { SegmentedTrades } from "@brrr/Brokerages/Ibkr/Schemas/SegmentedTrades";
import { FinancialEventsProcessor } from "@brrr/Core/FinancialEvents/FinancialEventsProcessor";
import { LotMatcher } from "@brrr/Core/LotMatching/LotMatcher";
import {
	GenericAssetClass,
	type GenericCategory,
	GenericDerivativeReportItemGainType,
	type GenericDividendType,
	type GenericShortLong,
	GenericTradeReportItemGainType,
} from "@brrr/Core/Schemas/CommonFormats";
import {
	TradeEventCashTransactionDividend,
	TradeEventCashTransactionPaymentInLieuOfDividend,
	TradeEventCashTransactionWithholdingTax,
	TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend,
	type TradeEventDerivative,
	TradeEventDerivativeAcquired,
	TradeEventDerivativeSold,
	type TradeEventStock,
	TradeEventStockAcquired,
	TradeEventStockSold,
	type TransactionCash,
} from "@brrr/Core/Schemas/Events";
import { FinancialEvents } from "@brrr/Core/Schemas/FinancialEvents";
import type { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier";
import { DerivativeGrouping, FinancialGrouping } from "@brrr/Core/Schemas/Grouping";
import type { IdentifierRelationshipAny } from "@brrr/Core/Schemas/IdentifierRelationship";
import { CountryName, Isin } from "@brrr/Core/Schemas/Identifiers";
import { TaxLot, type TaxLotDerivative, type TaxLotStock } from "@brrr/Core/Schemas/Lots";
import { StagingFinancialGroupingProcessor } from "@brrr/Core/StagingProcessor/StagingFinancialGroupingProcessor";
import { createContainer } from "@brrr/container";
import type { CompanyInfo, Country, InfoProvider } from "@brrr/InfoProviders/InfoProvider";
import { PredefinedInfoProvider } from "@brrr/InfoProviders/PredefinedInfoProvider";
import type {
	TaxAuthorityConfiguration,
	TaxAuthorityLotMatchingMethod,
	TaxPayerInfo,
} from "@brrr/TaxAuthorities/ConfigurationProvider";
import type { GeneratedExports } from "@brrr/TaxAuthorities/Interfaces/ITaxAuthorityProvider";
import type { SlovenianReportTypeId } from "@brrr/TaxAuthorities/Slovenia/Schemas/ReportTypes";
import { ReportTypeId, TaxAuthorityId } from "@brrr/TaxAuthorities/TaxAuthorityIdentifiers";
import { TaxAuthorityRegistry } from "@brrr/TaxAuthorities/TaxAuthorityRegistry";

type LotFields = { id: TaxLotStock["id"]; quantity: number; shortLongType: GenericShortLong };

// Builders for lib's objects. Each fixes only what its name says (a stock buy is a STOCK bought
// with multiplier 1; everything built has no provenance yet); every other value is required.
const build = {
	date: Values.date,

	stockBought(fields: TradeFields): TradeEventStockAcquired {
		return new TradeEventStockAcquired({
			id: fields.id,
			assetClass: GenericAssetClass.STOCK,
			date: Values.date(fields.date),
			multiplier: 1,
			exchangedMoney: Values.tradeMoney(fields),
			acquiredReason: GenericTradeReportItemGainType.BOUGHT,
			provenance: [],
		});
	},

	stockSold(fields: TradeFields): TradeEventStockSold {
		return new TradeEventStockSold({
			id: fields.id,
			assetClass: GenericAssetClass.STOCK,
			date: Values.date(fields.date),
			multiplier: 1,
			exchangedMoney: Values.tradeMoney(fields),
			provenance: [],
		});
	},

	optionBought(fields: TradeFields & { multiplier: number }): TradeEventDerivativeAcquired {
		return new TradeEventDerivativeAcquired({
			id: fields.id,
			assetClass: GenericAssetClass.OPTION,
			date: Values.date(fields.date),
			multiplier: fields.multiplier,
			exchangedMoney: Values.tradeMoney(fields),
			acquiredReason: GenericDerivativeReportItemGainType.BOUGHT,
			provenance: [],
		});
	},

	optionSold(fields: TradeFields & { multiplier: number }): TradeEventDerivativeSold {
		return new TradeEventDerivativeSold({
			id: fields.id,
			assetClass: GenericAssetClass.OPTION,
			date: Values.date(fields.date),
			multiplier: fields.multiplier,
			exchangedMoney: Values.tradeMoney(fields),
			provenance: [],
		});
	},

	dividend(
		fields: CashFields & { dividendType: GenericDividendType },
	): TradeEventCashTransactionDividend {
		return new TradeEventCashTransactionDividend({
			...cashEvent(fields),
			dividendType: fields.dividendType,
		});
	},

	withholdingTax(fields: CashFields): TradeEventCashTransactionWithholdingTax {
		return new TradeEventCashTransactionWithholdingTax(cashEvent(fields));
	},

	paymentInLieu(
		fields: CashFields & { dividendType: GenericDividendType },
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
		return new TaxLot({ ...fields, provenance: [] });
	},

	derivativeTaxLot(
		fields: LotFields & { acquired: TradeEventDerivativeAcquired; sold: TradeEventDerivativeSold },
	): TaxLotDerivative {
		return new TaxLot({ ...fields, provenance: [] });
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
			provenance: [],
		});
	},

	grouping(fields: {
		identifier: FinancialIdentifier;
		countryOfOrigin: FinancialGrouping["countryOfOrigin"];
		category: GenericCategory;
		stockTrades: TradeEventStock[];
		stockTaxLots: TaxLotStock[];
		derivativeGroupings: DerivativeGrouping[];
		cashTransactions: TransactionCash[];
	}): FinancialGrouping {
		return new FinancialGrouping({
			financialIdentifier: fields.identifier,
			countryOfOrigin: fields.countryOfOrigin,
			underlyingCategory: fields.category,
			stockTrades: fields.stockTrades,
			stockTaxLots: fields.stockTaxLots,
			derivativeGroupings: fields.derivativeGroupings,
			cashTransactions: fields.cashTransactions,
			provenance: [],
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
		assetClass: GenericAssetClass.CASH_AND_CASH_EQUIVALENTS,
		date: Values.date(fields.date),
		multiplier: 1,
		exchangedMoney: Values.cashMoney(fields),
		actionId: fields.actionId,
		transactionId: fields.transactionId,
		listingExchange: fields.listingExchange,
		provenance: [],
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
			info.addCompany(Isin.Schema.parse(isin), company);
		}
		for (const [name, country] of Object.entries(lookups.countries)) {
			info.addCountry(CountryName.Schema.parse(name), country);
		}
		return info;
	},
};

const pipeline = {
	// Broker exports to FinancialEvents, through the same calls the CLI and the site make.
	run(files: { fileName: string; xml: string }[]) {
		const container = createContainer(new PredefinedInfoProvider());
		const { detections, stagingEvents } = container
			.get(BrokerageRegistry)
			.loadAndTransformDetected(files);

		const unread = detections.filter((d) => d.error !== null || d.detectedBrokerage === null);
		if (unread.length > 0) {
			throw new Error(`Not read as a broker export: ${unread.map((d) => d.fileName).join(", ")}`);
		}

		const events = container
			.get(StagingFinancialGroupingProcessor)
			.processStagingFinancialEvents(stagingEvents);
		return { detections, stagingEvents, events };
	},

	// One Slovenian report for a calendar year.
	async generate(
		events: FinancialEvents,
		options: {
			report: SlovenianReportTypeId;
			year: number;
			lotMatching: TaxAuthorityLotMatchingMethod;
			taxPayer: TaxPayerInfo;
			info: InfoProvider;
		},
	): Promise<GeneratedExports> {
		const container = createContainer(options.info);
		return await container.get(TaxAuthorityRegistry).generateExports({
			authorityId: TaxAuthorityId.SLOVENIA,
			reportTypeId: ReportTypeId.Schema.parse(options.report),
			taxPayerInfo: options.taxPayer,
			reportConfig: config.report(options.year, options.lotMatching),
			events,
		});
	},

	eventsProcessor(): FinancialEventsProcessor {
		return new FinancialEventsProcessor(new LotMatcher());
	},
};

// Builders, configuration and the pipeline for lib's tests. Named test data lives in Fixtures.
export const Scenario = { build, config, pipeline };
