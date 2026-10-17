import type { Nominal } from "@brrr/Utils/NominalType";
import { z } from "zod/v4";

// The identifiers in a Flex Query row, typed where the row is parsed. Only the ones the transform
// reads have a type; they take a core type in Transform.ts.

export type IbkrTransactionId = Nominal<string, "Ibkr.TransactionId">;
export const IbkrTransactionId = {
	Schema: z.string().transform((value) => value as IbkrTransactionId),
};

export type IbkrActionId = Nominal<string, "Ibkr.ActionId">;
export const IbkrActionId = {
	Schema: z.string().transform((value) => value as IbkrActionId),
};

export type IbkrIsin = Nominal<string, "Ibkr.Isin">;
export const IbkrIsin = {
	Schema: z.string().transform((value) => value as IbkrIsin),
};

// An option's `underlyingSecurityID`; the transform reads it as the underlying's ISIN.
export type IbkrSecurityId = Nominal<string, "Ibkr.SecurityId">;
export const IbkrSecurityId = {
	Schema: z.string().transform((value) => value as IbkrSecurityId),
};

export type IbkrSymbol = Nominal<string, "Ibkr.Symbol">;
export const IbkrSymbol = {
	Schema: z.string().transform((value) => value as IbkrSymbol),
};

export type IbkrCurrency = Nominal<string, "Ibkr.Currency">;
export const IbkrCurrency = {
	Schema: z.string().transform((value) => value as IbkrCurrency),
};

export type IbkrListingExchange = Nominal<string, "Ibkr.ListingExchange">;
export const IbkrListingExchange = {
	Schema: z.string().transform((value) => value as IbkrListingExchange),
};
