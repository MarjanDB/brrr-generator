import type { RenameProvenanceStep } from "@brrr/Core/Models/Provenance/RenameProvenanceStep";
import type { SplitProvenanceStep } from "@brrr/Core/Models/Provenance/SplitProvenanceStep";

export type AnyProvenanceStep = RenameProvenanceStep | SplitProvenanceStep;
