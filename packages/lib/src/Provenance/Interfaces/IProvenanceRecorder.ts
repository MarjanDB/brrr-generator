import type { DropReason } from "@brrr/Provenance/Models/DropReason";
import type { ProvenanceChange } from "@brrr/Provenance/Models/ProvenanceChange";
import type { ProvenanceDetail } from "@brrr/Provenance/Models/ProvenanceDetail";
import type { ProvenanceStage } from "@brrr/Provenance/Models/ProvenanceIdentifiers";
import type { ProvenanceNodeKind } from "@brrr/Provenance/Models/ProvenanceNodeKind";

export interface IProvenanceRecorder {
	// Registers an object as a node. Idempotent: the same object is always the same node.
	// The keys of a ROW's fields are the broker's attribute names; every other kind's are
	// ProvenanceField (or, for report lines and sums, the authority's own enum).
	node(
		subject: object,
		kind: ProvenanceNodeKind,
		label: string,
		fields: Record<string, string>,
	): void;
	// `to` was made from `from` by `by`. Both ends must already be recorded as nodes.
	derive(
		from: object[],
		to: object,
		change: ProvenanceChange,
		by: ProvenanceStage,
		detail: string | null,
	): void;
	// `subject` goes no further, for `reason`.
	drop(
		subject: object,
		reason: DropReason,
		by: ProvenanceStage,
		detail: ProvenanceDetail | null,
	): void;
	// `subject` went on, but something about it is worth knowing.
	warn(subject: object, by: ProvenanceStage, detail: ProvenanceDetail): void;
}
