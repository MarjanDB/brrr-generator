import type { DateTime } from "luxon";

// https://www.racunovodstvo.net/zakonodaja/zdoh/90-clen
export enum EDavkiDividendType {
	UNKNOWN = "",
	ORDINARY = "1",
	CONSTRUCTIVE = "2",
	LIQUIDATING = "3",
	OTHER = "4",
	OTHER_2 = "5",
	BONUS = "6",
}

export class EDavkiDividendReportLine {
	public dateReceived: DateTime;
	public taxNumberForDividendPayer: string;
	public dividendPayerIdentificationNumber: string;
	public dividendPayerTitle: string;
	public dividendPayerAddress: string | null;
	public dividendPayerCountryOfOrigin: string;
	public dividendType: EDavkiDividendType;
	public countryOfOrigin: string;
	public dividendIdentifierForTracking: string;
	public taxReliefParagraphInInternationalTreaty: string | null;
	public dividendAmount: number;
	public dividendAmountInOriginalCurrency: number;
	public foreignTaxPaid: number;
	public foreignTaxPaidInOriginalCurrency: number;

	constructor(args: {
		dateReceived: DateTime;
		taxNumberForDividendPayer: string;
		dividendPayerIdentificationNumber: string;
		dividendPayerTitle: string;
		dividendPayerAddress: string | null;
		dividendPayerCountryOfOrigin: string;
		dividendType: EDavkiDividendType;
		countryOfOrigin: string;
		dividendIdentifierForTracking: string;
		taxReliefParagraphInInternationalTreaty: string | null;
		dividendAmount: number;
		dividendAmountInOriginalCurrency: number;
		foreignTaxPaid: number;
		foreignTaxPaidInOriginalCurrency: number;
	}) {
		this.dateReceived = args.dateReceived;
		this.taxNumberForDividendPayer = args.taxNumberForDividendPayer;
		this.dividendPayerIdentificationNumber = args.dividendPayerIdentificationNumber;
		this.dividendPayerTitle = args.dividendPayerTitle;
		this.dividendPayerAddress = args.dividendPayerAddress;
		this.dividendPayerCountryOfOrigin = args.dividendPayerCountryOfOrigin;
		this.dividendType = args.dividendType;
		this.countryOfOrigin = args.countryOfOrigin;
		this.dividendIdentifierForTracking = args.dividendIdentifierForTracking;
		this.taxReliefParagraphInInternationalTreaty = args.taxReliefParagraphInInternationalTreaty;
		this.dividendAmount = args.dividendAmount;
		this.dividendAmountInOriginalCurrency = args.dividendAmountInOriginalCurrency;
		this.foreignTaxPaid = args.foreignTaxPaid;
		this.foreignTaxPaidInOriginalCurrency = args.foreignTaxPaidInOriginalCurrency;
	}
}

export enum EDavkiTradeSecurityType {
	SECURITY = "PLVP",
	SECURITY_SHORT = "PLVPSHORT",
	SECURITY_WITH_CONTRACT = "PLVPG",
	SECURITY_WITH_CONTRACT_SHORT = "PLVPGBSHORT",
	SHARE = "PLD",
	SECURITY_WITH_CAPITAL_REDUCTION = "PLVPZOK",
}

export enum EDavkiTradeReportGainType {
	CAPITAL_INVESTMENT = "A",
	BOUGHT = "B",
	CAPITAL_RAISE = "C",
	CAPITAL_ASSET_RAISE = "D",
	CAPITALIZATION_CHANGE = "E",
	INHERITENCE = "F",
	GIFT = "G",
	OTHER = "H",
}

export class EDavkiTradeReportSecurityLineGenericEventBought {
	public readonly boughtOn: DateTime;
	public readonly gainType: EDavkiTradeReportGainType;
	public readonly quantity: number;
	public readonly pricePerUnit: number;
	public readonly pricePerUnitInOriginalCurrency: number;
	public readonly totalPrice: number;
	public readonly totalPriceInOriginalCurrency: number;
	public readonly commissions: number;
	public readonly commissionsInOriginalCurrency: number;
	public readonly inheritanceAndGiftTaxPaid: number | null;
	public readonly baseTaxReduction: number | null;

	constructor(args: {
		boughtOn: DateTime;
		gainType: EDavkiTradeReportGainType;
		quantity: number;
		pricePerUnit: number;
		pricePerUnitInOriginalCurrency: number;
		totalPrice: number;
		totalPriceInOriginalCurrency: number;
		commissions: number;
		commissionsInOriginalCurrency: number;
		inheritanceAndGiftTaxPaid: number | null;
		baseTaxReduction: number | null;
	}) {
		this.boughtOn = args.boughtOn;
		this.gainType = args.gainType;
		this.quantity = args.quantity;
		this.pricePerUnit = args.pricePerUnit;
		this.pricePerUnitInOriginalCurrency = args.pricePerUnitInOriginalCurrency;
		this.totalPrice = args.totalPrice;
		this.totalPriceInOriginalCurrency = args.totalPriceInOriginalCurrency;
		this.commissions = args.commissions;
		this.commissionsInOriginalCurrency = args.commissionsInOriginalCurrency;
		this.inheritanceAndGiftTaxPaid = args.inheritanceAndGiftTaxPaid;
		this.baseTaxReduction = args.baseTaxReduction;
	}
}

export class EDavkiTradeReportSecurityLineGenericEventSold {
	public readonly soldOn: DateTime;
	public readonly quantity: number;
	public readonly totalPrice: number;
	public readonly totalPriceInOriginalCurrency: number;
	public readonly pricePerUnit: number;
	public readonly pricePerUnitInOriginalCurrency: number;
	public readonly commissions: number;
	public readonly commissionsInOriginalCurrency: number;
	public readonly satisfiesTaxBasisReduction: boolean;

	constructor(args: {
		soldOn: DateTime;
		quantity: number;
		totalPrice: number;
		totalPriceInOriginalCurrency: number;
		pricePerUnit: number;
		pricePerUnitInOriginalCurrency: number;
		commissions: number;
		commissionsInOriginalCurrency: number;
		satisfiesTaxBasisReduction: boolean;
	}) {
		this.soldOn = args.soldOn;
		this.quantity = args.quantity;
		this.totalPrice = args.totalPrice;
		this.totalPriceInOriginalCurrency = args.totalPriceInOriginalCurrency;
		this.pricePerUnit = args.pricePerUnit;
		this.pricePerUnitInOriginalCurrency = args.pricePerUnitInOriginalCurrency;
		this.commissions = args.commissions;
		this.commissionsInOriginalCurrency = args.commissionsInOriginalCurrency;
		this.satisfiesTaxBasisReduction = args.satisfiesTaxBasisReduction;
	}
}

export class EDavkiTradeReportSecurityLineEvent {
	public readonly isin: string;
	public readonly code: string | null;
	public readonly name: string | null;
	public readonly isFund: boolean;
	public readonly resolution: string | null;
	public readonly resolutionDate: DateTime | null;
	public readonly events: (EDavkiTradeReportSecurityLineGenericEventBought | EDavkiTradeReportSecurityLineGenericEventSold)[];

	constructor(args: {
		isin: string;
		code: string | null;
		name: string | null;
		isFund: boolean;
		resolution: string | null;
		resolutionDate: DateTime | null;
		events: (EDavkiTradeReportSecurityLineGenericEventBought | EDavkiTradeReportSecurityLineGenericEventSold)[];
	}) {
		this.isin = args.isin;
		this.code = args.code;
		this.name = args.name;
		this.isFund = args.isFund;
		this.resolution = args.resolution;
		this.resolutionDate = args.resolutionDate;
		this.events = args.events;
	}
}

export class EDavkiGenericTradeReportItem {
	public readonly itemId: string | null;
	public readonly inventoryListType: EDavkiTradeSecurityType;
	public readonly name: string | null;
	public readonly hasForeignTax: boolean;
	public readonly foreignTax: number | null;
	public readonly ftCountryId: string | null;
	public readonly ftCountryName: string | null;
	public readonly hasLossTransfer: boolean | null;
	public readonly foreignTransfer: boolean | null;
	public readonly taxDecreaseConformance: boolean | null;
	public readonly items: EDavkiTradeReportSecurityLineEvent[];

	constructor(args: {
		itemId: string | null;
		inventoryListType: EDavkiTradeSecurityType;
		name: string | null;
		hasForeignTax: boolean;
		foreignTax: number | null;
		ftCountryId: string | null;
		ftCountryName: string | null;
		hasLossTransfer: boolean | null;
		foreignTransfer: boolean | null;
		taxDecreaseConformance: boolean | null;
		items: EDavkiTradeReportSecurityLineEvent[];
	}) {
		this.itemId = args.itemId;
		this.inventoryListType = args.inventoryListType;
		this.name = args.name;
		this.hasForeignTax = args.hasForeignTax;
		this.foreignTax = args.foreignTax;
		this.ftCountryId = args.ftCountryId;
		this.ftCountryName = args.ftCountryName;
		this.hasLossTransfer = args.hasLossTransfer;
		this.foreignTransfer = args.foreignTransfer;
		this.taxDecreaseConformance = args.taxDecreaseConformance;
		this.items = args.items;
	}
}

export enum EDavkiDerivativeSecurityType {
	FUTURES_CONTRACT = "01",
	CONTRACT_FOR_DIFFERENCE = "02",
	OPTION_OR_CERTIFICATE = "03",
	OTHER = "04",
}

export enum EDavkiDerivativeSecurityTypeName {
	FUTURES_CONTRACT = "terminska pogodba",
	CONTRACT_FOR_DIFFERENCE = "finančne pogodbe na razliko",
	OPTION_OR_CERTIFICATE = "opcija in certifikat",
	OTHER = "drugo",
}

export enum EDavkiDerivativeReportGainType {
	BOUGHT = "A",
	INHERITENCE = "B",
	GIFT = "C",
	OTHER = "D",
}

export enum EDavkiDerivativeReportItemType {
	DERIVATIVE = "PLIFI",
	DERIVATIVE_SHORT = "PLIFIShort",
}

export class EDavkiDerivativeReportSecurityLineGenericEventBought {
	public readonly boughtOn: DateTime;
	public readonly gainType: EDavkiDerivativeReportGainType;
	public readonly quantity: number;
	public readonly pricePerUnit: number;
	public readonly pricePerUnitInOriginalCurrency: number;
	public readonly totalPrice: number;
	public readonly totalPriceInOriginalCurrency: number;
	public readonly commissions: number;
	public readonly commissionsInOriginalCurrency: number;
	public readonly leveraged: boolean;

	constructor(args: {
		boughtOn: DateTime;
		gainType: EDavkiDerivativeReportGainType;
		quantity: number;
		pricePerUnit: number;
		pricePerUnitInOriginalCurrency: number;
		totalPrice: number;
		totalPriceInOriginalCurrency: number;
		commissions: number;
		commissionsInOriginalCurrency: number;
		leveraged: boolean;
	}) {
		this.boughtOn = args.boughtOn;
		this.gainType = args.gainType;
		this.quantity = args.quantity;
		this.pricePerUnit = args.pricePerUnit;
		this.pricePerUnitInOriginalCurrency = args.pricePerUnitInOriginalCurrency;
		this.totalPrice = args.totalPrice;
		this.totalPriceInOriginalCurrency = args.totalPriceInOriginalCurrency;
		this.commissions = args.commissions;
		this.commissionsInOriginalCurrency = args.commissionsInOriginalCurrency;
		this.leveraged = args.leveraged;
	}
}

export class EDavkiDerivativeReportSecurityLineGenericEventSold {
	public readonly soldOn: DateTime;
	public readonly quantity: number;
	public readonly pricePerUnit: number;
	public readonly pricePerUnitInOriginalCurrency: number;
	public readonly totalPrice: number;
	public readonly totalPriceInOriginalCurrency: number;
	public readonly commissions: number;
	public readonly commissionsInOriginalCurrency: number;
	public readonly leveraged: boolean;

	constructor(args: {
		soldOn: DateTime;
		quantity: number;
		pricePerUnit: number;
		pricePerUnitInOriginalCurrency: number;
		totalPrice: number;
		totalPriceInOriginalCurrency: number;
		commissions: number;
		commissionsInOriginalCurrency: number;
		leveraged: boolean;
	}) {
		this.soldOn = args.soldOn;
		this.quantity = args.quantity;
		this.pricePerUnit = args.pricePerUnit;
		this.pricePerUnitInOriginalCurrency = args.pricePerUnitInOriginalCurrency;
		this.totalPrice = args.totalPrice;
		this.totalPriceInOriginalCurrency = args.totalPriceInOriginalCurrency;
		this.commissions = args.commissions;
		this.commissionsInOriginalCurrency = args.commissionsInOriginalCurrency;
		this.leveraged = args.leveraged;
	}
}

export type EdavkiDerivativeReportSecurityLines =
	| EDavkiDerivativeReportSecurityLineGenericEventBought
	| EDavkiDerivativeReportSecurityLineGenericEventSold;

export class EDavkiGenericDerivativeReportItem {
	public readonly inventoryListType: EDavkiDerivativeSecurityType;
	public readonly itemType: EDavkiDerivativeReportItemType;
	public readonly name: string | null;
	public readonly code: string | null;
	public readonly isin: string | null;
	public readonly hasForeignTax: boolean;
	public readonly foreignTax: number | null;
	public readonly ftCountryId: string | null;
	public readonly ftCountryName: string | null;
	public readonly items: EdavkiDerivativeReportSecurityLines[];

	constructor(args: {
		inventoryListType: EDavkiDerivativeSecurityType;
		itemType: EDavkiDerivativeReportItemType;
		name: string | null;
		code: string | null;
		isin: string | null;
		hasForeignTax: boolean;
		foreignTax: number | null;
		ftCountryId: string | null;
		ftCountryName: string | null;
		items: EdavkiDerivativeReportSecurityLines[];
	}) {
		this.inventoryListType = args.inventoryListType;
		this.itemType = args.itemType;
		this.name = args.name;
		this.code = args.code;
		this.isin = args.isin;
		this.hasForeignTax = args.hasForeignTax;
		this.foreignTax = args.foreignTax;
		this.ftCountryId = args.ftCountryId;
		this.ftCountryName = args.ftCountryName;
		this.items = args.items;
	}
}
