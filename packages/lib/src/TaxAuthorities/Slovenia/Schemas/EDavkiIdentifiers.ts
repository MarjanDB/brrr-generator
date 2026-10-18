import type { CashActionId, CountryCode, Isin, Ticker } from "@brrr/Core/Models/Identifiers";
import type { Nominal } from "@brrr/Utils/NominalType";
import { z } from "zod/v4";

// The identifiers the eDavki forms carry. The report generators build them from core identifiers
// with the From* helpers.

export type EDavkiIsin = Nominal<string, "EDavki.Isin">;
export const EDavkiIsin = {
	Schema: z.string().transform((value) => value as EDavkiIsin),
	FromIsin: (isin: Isin): EDavkiIsin => EDavkiIsin.Schema.parse(isin),
};

// A security's ticker (`Code`).
export type EDavkiSecurityCode = Nominal<string, "EDavki.SecurityCode">;
export const EDavkiSecurityCode = {
	Schema: z.string().transform((value) => value as EDavkiSecurityCode),
	FromTicker: (ticker: Ticker): EDavkiSecurityCode => EDavkiSecurityCode.Schema.parse(ticker),
};

export type EDavkiCountryCode = Nominal<string, "EDavki.CountryCode">;
export const EDavkiCountryCode = {
	Schema: z.string().transform((value) => value as EDavkiCountryCode),
	FromCountryCode: (code: CountryCode): EDavkiCountryCode => EDavkiCountryCode.Schema.parse(code),
};

// A dividend payer's tax number (`PayerTaxNumber`).
export type EDavkiTaxNumber = Nominal<string, "EDavki.TaxNumber">;
export const EDavkiTaxNumber = {
	Schema: z.string().transform((value) => value as EDavkiTaxNumber),
};

// `PayerIdentificationNumber`: the payer's ISIN for a foreign payer.
export type EDavkiPayerIdentificationNumber = Nominal<string, "EDavki.PayerIdentificationNumber">;
export const EDavkiPayerIdentificationNumber = {
	Schema: z.string().transform((value) => value as EDavkiPayerIdentificationNumber),
	FromIsin: (isin: Isin): EDavkiPayerIdentificationNumber =>
		EDavkiPayerIdentificationNumber.Schema.parse(isin),
};

// Ties a DOH_DIV line back to the cash actions it adds up.
export type EDavkiDividendTrackingId = Nominal<string, "EDavki.DividendTrackingId">;
export const EDavkiDividendTrackingId = {
	Schema: z.string().transform((value) => value as EDavkiDividendTrackingId),
	FromCashActionId: (actionId: CashActionId): EDavkiDividendTrackingId =>
		EDavkiDividendTrackingId.Schema.parse(actionId),
};
