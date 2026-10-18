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
