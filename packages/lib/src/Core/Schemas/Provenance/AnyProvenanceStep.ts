import type { RenameProvenanceStep } from "@brrr/Core/Schemas/Provenance/RenameProvenanceStep";
import type { SplitProvenanceStep } from "@brrr/Core/Schemas/Provenance/SplitProvenanceStep";

export type AnyProvenanceStep = RenameProvenanceStep | SplitProvenanceStep;
