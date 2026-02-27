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

export type EDavkiDividendReportLine = {
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
};

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

export type EDavkiTradeReportSecurityLineGenericEventBought = {
  kind: "Bought";
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
};

export type EDavkiTradeReportSecurityLineGenericEventSold = {
  kind: "Sold";
  soldOn: DateTime;
  quantity: number;
  totalPrice: number;
  totalPriceInOriginalCurrency: number;
  pricePerUnit: number;
  pricePerUnitInOriginalCurrency: number;
  commissions: number;
  commissionsInOriginalCurrency: number;
  satisfiesTaxBasisReduction: boolean;
};

export type EDavkiTradeReportSecurityLineEvent = {
  isin: string;
  code: string | null;
  name: string | null;
  isFund: boolean;
  resolution: string | null;
  resolutionDate: DateTime | null;
  events: (EDavkiTradeReportSecurityLineGenericEventBought | EDavkiTradeReportSecurityLineGenericEventSold)[];
};

export type EDavkiGenericTradeReportItem = {
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
};

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

export type EDavkiDerivativeReportSecurityLineGenericEventBought = {
  kind: "DerivativeBought";
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
};

export type EDavkiDerivativeReportSecurityLineGenericEventSold = {
  kind: "DerivativeSold";
  soldOn: DateTime;
  quantity: number;
  pricePerUnit: number;
  pricePerUnitInOriginalCurrency: number;
  totalPrice: number;
  totalPriceInOriginalCurrency: number;
  commissions: number;
  commissionsInOriginalCurrency: number;
  leveraged: boolean;
};

export type EdavkiDerivativeReportSecurityLines =
  | EDavkiDerivativeReportSecurityLineGenericEventBought
  | EDavkiDerivativeReportSecurityLineGenericEventSold;

export type EDavkiGenericDerivativeReportItem = {
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
};
