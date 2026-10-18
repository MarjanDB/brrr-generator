import type { IProvenanceRecorder } from "@brrr/Provenance/Interfaces/IProvenanceRecorder";
import type { DropReason } from "@brrr/Provenance/Models/DropReason";
import type { ProvenanceChange } from "@brrr/Provenance/Models/ProvenanceChange";
import type { ProvenanceDetail } from "@brrr/Provenance/Models/ProvenanceDetail";
import type { ProvenanceStage } from "@brrr/Provenance/Models/ProvenanceIdentifiers";
import type { ProvenanceNodeKind } from "@brrr/Provenance/Models/ProvenanceNodeKind";

// Records nothing. For tests that aren't about lineage, and for the "numbers unchanged" test.
export class NullProvenanceRecorder implements IProvenanceRecorder {
	public node(
		_subject: object,
		_kind: ProvenanceNodeKind,
		_label: string,
		_fields: Record<string, string>,
	): void {}

	public derive(
		_from: object[],
		_to: object,
		_change: ProvenanceChange,
		_by: ProvenanceStage,
		_detail: string | null,
	): void {}

	public drop(
		_subject: object,
		_reason: DropReason,
		_by: ProvenanceStage,
		_detail: ProvenanceDetail | null,
	): void {}

	public warn(_subject: object, _by: ProvenanceStage, _detail: ProvenanceDetail): void {}
}
