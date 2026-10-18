import { toArray } from "@brrr/Brokers/Ibkr/Schemas/FieldParsers";
import { FlexStatementSchema } from "@brrr/Brokers/Ibkr/Schemas/FlexStatement";
import { z } from "zod/v4";

export const FlexQueryResponseSchema = z.object({
	FlexQueryResponse: z.object({
		FlexStatements: z.object({
			FlexStatement: toArray(FlexStatementSchema),
		}),
	}),
});
