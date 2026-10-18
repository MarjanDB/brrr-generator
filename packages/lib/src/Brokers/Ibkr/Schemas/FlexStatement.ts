import { toArray } from "@brrr/Brokers/Ibkr/Schemas/FieldParsers";
import { z } from "zod/v4";

const RawRecord = z.record(z.string(), z.unknown());

function emptyIfNotObject(v: unknown): unknown {
	return typeof v === "object" && v !== null ? v : {};
}

export const FlexStatementSchema = z.object({
	Trades: z
		.preprocess(
			emptyIfNotObject,
			z.object({
				Trade: toArray(RawRecord),
				Lot: toArray(RawRecord),
			}),
		)
		.optional()
		.transform((v) => v ?? { Trade: [], Lot: [] }),
	CashTransactions: z
		.preprocess(
			emptyIfNotObject,
			z.object({
				CashTransaction: toArray(RawRecord),
			}),
		)
		.optional()
		.transform((v) => v ?? { CashTransaction: [] }),
	CorporateActions: z
		.preprocess(
			emptyIfNotObject,
			z.object({
				CorporateAction: toArray(RawRecord),
			}),
		)
		.optional()
		.transform((v) => v ?? { CorporateAction: [] }),
});

export type FlexStatement = z.output<typeof FlexStatementSchema>;
