import type { Nominal } from "@brrr/Utils/NominalType";
import { z } from "zod/v4";

export type ProvenanceNodeId = Nominal<string, "Provenance.NodeId">;
export const ProvenanceNodeId = {
	Schema: z.string().transform((value) => value as ProvenanceNodeId),
};

export type ProvenanceStage = Nominal<string, "Provenance.Stage">;
export const ProvenanceStage = {
	Schema: z.string().transform((value) => value as ProvenanceStage),
};

// An option's underlying as the graph recorded it (the UNDERLYING_SYMBOL field).
export type ProvenanceUnderlyingSymbol = Nominal<string, "Provenance.UnderlyingSymbol">;
export const ProvenanceUnderlyingSymbol = {
	Schema: z.string().transform((value) => value as ProvenanceUnderlyingSymbol),
};
