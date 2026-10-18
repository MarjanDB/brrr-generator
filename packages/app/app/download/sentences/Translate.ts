import type { TaxAuthorityLotMatchingMethod } from "@brrr/lib";

// What the component passes in: `(key, params) => t(key, params)`.
export type Translate = (key: string, params: Record<string, string>) => string;

// How the values of a sentence are written for the reader's locale.
export type SentenceFormat = {
	date(iso: string): string;
	method(method: TaxAuthorityLotMatchingMethod): string;
};
