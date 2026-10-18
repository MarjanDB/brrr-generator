import type { Nominal } from "@brrr/Utils/NominalType";
import { z } from "zod/v4";

// The identifiers of the core model (staging included) and of the lookups. Brokers and tax
// authorities have their own; a value takes a core type where it enters the core model.

export type Isin = Nominal<string, "Core.Isin">;
export const Isin = {
	Schema: z.string().transform((value) => value as Isin),
};

export type Ticker = Nominal<string, "Core.Ticker">;
export const Ticker = {
	Schema: z.string().transform((value) => value as Ticker),
};

// What `toKey()` gives: ISIN, ticker and name together.
export type FinancialIdentifierKey = Nominal<string, "Core.FinancialIdentifierKey">;
export const FinancialIdentifierKey = {
	Schema: z.string().transform((value) => value as FinancialIdentifierKey),
};

export type TradeEventId = Nominal<string, "Core.TradeEventId">;
export const TradeEventId = {
	Schema: z.string().transform((value) => value as TradeEventId),
};

export type TaxLotId = Nominal<string, "Core.TaxLotId">;
export const TaxLotId = {
	Schema: z.string().transform((value) => value as TaxLotId),
};

// Shared by a dividend and the tax withheld from it.
export type CashActionId = Nominal<string, "Core.CashActionId">;
export const CashActionId = {
	Schema: z.string().transform((value) => value as CashActionId),
};

export type CashTransactionId = Nominal<string, "Core.CashTransactionId">;
export const CashTransactionId = {
	Schema: z.string().transform((value) => value as CashTransactionId),
};

export type ListingExchange = Nominal<string, "Core.ListingExchange">;
export const ListingExchange = {
	Schema: z.string().transform((value) => value as ListingExchange),
};

// Shared by the two halves of a corporate action.
export type CorrelationKey = Nominal<string, "Core.CorrelationKey">;
export const CorrelationKey = {
	Schema: z.string().transform((value) => value as CorrelationKey),
};

export type CurrencyCode = Nominal<string, "Core.CurrencyCode">;
export const CurrencyCode = {
	Schema: z.string().transform((value) => value as CurrencyCode),
};

// Two letters (ISO 3166-1 alpha-2).
export type CountryCode = Nominal<string, "Core.CountryCode">;
export const CountryCode = {
	Schema: z.string().transform((value) => value as CountryCode),
};

// The lookups key countries by name.
export type CountryName = Nominal<string, "Core.CountryName">;
export const CountryName = {
	Schema: z.string().transform((value) => value as CountryName),
};
