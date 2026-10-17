import { IbkrRows } from "@brrr/__tests__/support/IbkrRows";
import { StagingBuilders } from "@brrr/__tests__/support/StagingBuilders";
import { type CashOptions, type TradeOptions, Values } from "@brrr/__tests__/support/Values";
import { BrokerageRegistry } from "@brrr/Brokerages/BrokerageRegistry";
import { FinancialEventsProcessor } from "@brrr/Core/FinancialEvents/FinancialEventsProcessor";
import { LotMatcher } from "@brrr/Core/LotMatching/LotMatcher";
import {
	GenericAssetClass,
	GenericCategory,
	GenericDerivativeReportItemGainType,
	GenericDividendType,
	GenericShortLong,
	GenericTradeReportItemGainType,
} from "@brrr/Core/Schemas/CommonFormats";
import {
	type TradeEventBase,
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
import { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier";
import { DerivativeGrouping, FinancialGrouping } from "@brrr/Core/Schemas/Grouping";
import type { IdentifierRelationshipAny } from "@brrr/Core/Schemas/IdentifierRelationship";
import { TaxLot, type TaxLotDerivative, type TaxLotStock } from "@brrr/Core/Schemas/Lots";
import type { AnyProvenanceStep } from "@brrr/Core/Schemas/Provenance";
import { StagingFinancialGroupingProcessor } from "@brrr/Core/StagingProcessor/StagingFinancialGroupingProcessor";
import { createContainer } from "@brrr/container";
import type { CompanyInfo, Country, InfoProvider } from "@brrr/InfoProviders/InfoProvider";
import { PredefinedInfoProvider } from "@brrr/InfoProviders/PredefinedInfoProvider";
import {
	type TaxAuthorityConfiguration,
	TaxAuthorityLotMatchingMethod,
	type TaxPayerInfo,
	TaxPayerType,
} from "@brrr/TaxAuthorities/ConfigurationProvider";
import type { GeneratedExports } from "@brrr/TaxAuthorities/Interfaces/ITaxAuthorityProvider";
import type { SlovenianReportTypeId } from "@brrr/TaxAuthorities/Slovenia/Schemas/ReportTypes";
import { TaxAuthorityRegistry } from "@brrr/TaxAuthorities/TaxAuthorityRegistry";

type WithProvenance = { provenance?: AnyProvenanceStep[] };

function tradeFields(options: TradeOptions & WithProvenance, prefix: string, quantity: number) {
	return {
		id: options.id ?? Values.nextId(prefix),
		date: Values.date(options.date ?? Values.defaultDate),
		multiplier: options.multiplier ?? 1,
		exchangedMoney: Values.tradeMoney(options, quantity),
		provenance: options.provenance ?? [],
	};
}

function cashFields(options: CashOptions & WithProvenance, prefix: string, amount: number) {
	return {
		...Values.cashFields(options, prefix),
		assetClass: GenericAssetClass.CASH_AND_CASH_EQUIVALENTS,
		exchangedMoney: Values.cashMoney(options, amount),
		provenance: options.provenance ?? [],
	};
}

const stockBought = (options: TradeOptions & WithProvenance = {}): TradeEventStockAcquired =>
	new TradeEventStockAcquired({
		...tradeFields(options, "stockBought", 1),
		assetClass: GenericAssetClass.STOCK,
		acquiredReason: GenericTradeReportItemGainType.BOUGHT,
	});

const stockSold = (options: TradeOptions & WithProvenance = {}): TradeEventStockSold =>
	new TradeEventStockSold({
		...tradeFields(options, "stockSold", -1),
		assetClass: GenericAssetClass.STOCK,
	});

const build = {
	date: Values.date,
	money: Values.money,

	stockBought,
	stockSold,

	// A buy for a positive quantity, a sale for a negative one.
	stockTrade(options: TradeOptions & WithProvenance & { quantity: number }): TradeEventStock {
		return options.quantity > 0 ? stockBought(options) : stockSold(options);
	},

	derivativeBought(options: TradeOptions & WithProvenance = {}): TradeEventDerivativeAcquired {
		return new TradeEventDerivativeAcquired({
			...tradeFields(options, "derivativeBought", 1),
			assetClass: GenericAssetClass.OPTION,
			acquiredReason: GenericDerivativeReportItemGainType.BOUGHT,
		});
	},

	derivativeSold(options: TradeOptions & WithProvenance = {}): TradeEventDerivativeSold {
		return new TradeEventDerivativeSold({
			...tradeFields(options, "derivativeSold", -1),
			assetClass: GenericAssetClass.OPTION,
		});
	},

	dividend(options: CashOptions & WithProvenance = {}): TradeEventCashTransactionDividend {
		return new TradeEventCashTransactionDividend({
			...cashFields(options, "dividend", 1),
			dividendType: GenericDividendType.ORDINARY,
		});
	},

	withholdingTax(
		options: CashOptions & WithProvenance = {},
	): TradeEventCashTransactionWithholdingTax {
		return new TradeEventCashTransactionWithholdingTax(cashFields(options, "withholdingTax", -1));
	},

	paymentInLieu(
		options: CashOptions & WithProvenance = {},
	): TradeEventCashTransactionPaymentInLieuOfDividend {
		return new TradeEventCashTransactionPaymentInLieuOfDividend({
			...cashFields(options, "paymentInLieu", 1),
			dividendType: GenericDividendType.ORDINARY,
		});
	},

	paymentInLieuWithholdingTax(
		options: CashOptions & WithProvenance = {},
	): TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend {
		return new TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend(
			cashFields(options, "paymentInLieuWithholdingTax", -1),
		);
	},

	// The quantity defaults to the acquired trade's.
	taxLot<A extends TradeEventBase, S extends TradeEventBase>(
		options: { id?: TaxLotStock["id"]; acquired: A; sold: S; quantity?: number } & WithProvenance,
	): TaxLot<A, S> {
		return new TaxLot({
			id: options.id ?? Values.nextId("lot"),
			quantity: options.quantity ?? options.acquired.exchangedMoney.underlyingQuantity,
			acquired: options.acquired,
			sold: options.sold,
			shortLongType: GenericShortLong.LONG,
			provenance: options.provenance ?? [],
		});
	},

	derivativeGrouping(
		options: {
			identifier?: FinancialIdentifier;
			trades?: TradeEventDerivative[];
			taxLots?: TaxLotDerivative[];
		} & WithProvenance = {},
	): DerivativeGrouping {
		return new DerivativeGrouping({
			financialIdentifier: options.identifier ?? new FinancialIdentifier({ isin: "ISIN" }),
			derivativeTrades: options.trades ?? [],
			derivativeTaxLots: options.taxLots ?? [],
			provenance: options.provenance ?? [],
		});
	},

	grouping(
		options: {
			identifier?: FinancialIdentifier;
			countryOfOrigin?: string | null;
			stockTrades?: TradeEventStock[];
			stockTaxLots?: TaxLotStock[];
			derivativeGroupings?: DerivativeGrouping[];
			cashTransactions?: TransactionCash[];
		} & WithProvenance = {},
	): FinancialGrouping {
		return new FinancialGrouping({
			financialIdentifier: options.identifier ?? new FinancialIdentifier({ isin: "ISIN" }),
			countryOfOrigin: options.countryOfOrigin ?? null,
			underlyingCategory: GenericCategory.REGULAR,
			stockTrades: options.stockTrades ?? [],
			stockTaxLots: options.stockTaxLots ?? [],
			derivativeGroupings: options.derivativeGroupings ?? [],
			cashTransactions: options.cashTransactions ?? [],
			provenance: options.provenance ?? [],
		});
	},

	events(
		groupings: FinancialGrouping[],
		identifierRelationships: IdentifierRelationshipAny[] = [],
	): FinancialEvents {
		return new FinancialEvents({ groupings, identifierRelationships });
	},

	staging: StagingBuilders,
	ibkr: IbkrRows,
};

const config = {
	// The taxpayer every expected report file was generated for.
	taxPayer: {
		taxNumber: "12345678",
		taxpayerType: TaxPayerType.PHYSICAL_SUBJECT,
		name: "Ime Priimek",
		address1: "Naslov 1",
		address2: null,
		city: "Ljubljana",
		postNumber: "1000",
		postName: "Ljubljana",
		municipalityName: "Ljubljana",
		birthDate: Values.date("1990-01-01"),
		maticnaStevilka: "1234567",
		invalidskoPodjetje: false,
		resident: true,
		activityCode: "",
		activityName: "",
		countryId: "SI",
		countryName: "Slovenija",
	} satisfies TaxPayerInfo,

	// The calendar year, from January 1st to the next January 1st.
	report(
		year: number,
		lotMatchingMethod = TaxAuthorityLotMatchingMethod.FIFO,
	): TaxAuthorityConfiguration {
		return {
			fromDate: Values.date(`${year}-01-01`),
			toDate: Values.date(`${year + 1}-01-01`),
			lotMatchingMethod,
		};
	},

	infoProvider(
		lookups: { companies?: Record<string, CompanyInfo>; countries?: Record<string, Country> } = {},
	): PredefinedInfoProvider {
		const info = new PredefinedInfoProvider();
		for (const [isin, company] of Object.entries(lookups.companies ?? {})) {
			info.addCompany(isin, company);
		}
		for (const [name, country] of Object.entries(lookups.countries ?? {})) {
			info.addCountry(name, country);
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
			lotMatching?: TaxAuthorityLotMatchingMethod;
			info?: InfoProvider;
			taxPayer?: TaxPayerInfo;
		},
	): Promise<GeneratedExports> {
		const container = createContainer(options.info ?? new PredefinedInfoProvider());
		return await container.get(TaxAuthorityRegistry).generateExports({
			authorityId: "slovenia",
			reportTypeId: options.report,
			taxPayerInfo: options.taxPayer ?? config.taxPayer,
			reportConfig: config.report(options.year, options.lotMatching),
			events,
		});
	},

	// Pins both files of a report. `vitest -u` rewrites them; review the diff before committing.
	async expectToMatch(
		report: GeneratedExports,
		expected: { xmlPath: string; csvPath: string },
	): Promise<void> {
		await expect(report.xml).toMatchFileSnapshot(expected.xmlPath);
		await expect(report.csv).toMatchFileSnapshot(expected.csvPath);
	},

	eventsProcessor(): FinancialEventsProcessor {
		return new FinancialEventsProcessor(new LotMatcher());
	},
};

// Everything lib's tests build: lib's objects with defaults, shared configuration, the pipeline.
export const Scenario = { build, config, pipeline };
