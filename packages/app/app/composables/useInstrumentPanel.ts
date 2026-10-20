import type { ProvenanceNode, ReportInstrument, ReportProvenance } from "@brrr/lib";
import type { ComputedRef, ShallowRef } from "vue";
import { InstrumentPanels } from "~/composables/instrumentPanel/instrumentPanels";
import type { PanelEntry, PanelSections } from "~/types/instrumentPanel";

export type InstrumentPanelState = {
	sections: ComputedRef<PanelSections>;
	selected: Readonly<ShallowRef<ReportInstrument | null>>;
	selectedEntry: ComputedRef<PanelEntry | null>;
	startAt: Readonly<ShallowRef<ProvenanceNode | null>>;
	entryCount: ComputedRef<number>;
	// The key the picked instrument's card is kept under.
	cardKey: ComputedRef<string>;
	select(instrument: ReportInstrument): void;
	// Picks an instrument with its card's focus on one of its items.
	show(instrument: ReportInstrument, at: ProvenanceNode): void;
};

// The report's instruments as the step's panel lists them, and the one picked. A report made again
// (another year, or a payer defined by hand) keeps the instrument it showed, when it has it; else it
// starts from its first.
export function useInstrumentPanel(reading: () => ReportProvenance): InstrumentPanelState {
	const sections = computed(() => InstrumentPanels.build(reading()));
	const selected = shallowRef<ReportInstrument | null>(
		InstrumentPanels.first(sections.value)?.instrument ?? null,
	);
	// Where the next card's focus starts, when a problem asked to show one of its items.
	const startAt = shallowRef<ProvenanceNode | null>(null);
	// How many reports the panel has listed: a report made again gets cards of its own.
	const made = ref(0);

	watch(sections, (next, previous) => {
		made.value++;
		startAt.value = null;
		const shown = selected.value === null ? null : InstrumentPanels.find(previous, selected.value);
		selected.value =
			(shown === null ? null : InstrumentPanels.sameEntryIn(next, shown)?.instrument) ??
			InstrumentPanels.first(next)?.instrument ??
			null;
	});

	function select(instrument: ReportInstrument) {
		startAt.value = null;
		selected.value = instrument;
	}

	function show(instrument: ReportInstrument, at: ProvenanceNode) {
		selected.value = instrument;
		startAt.value = at;
	}

	const entryCount = computed(() => InstrumentPanels.entriesOf(sections.value).length);
	const selectedEntry = computed(() =>
		selected.value === null ? null : InstrumentPanels.find(sections.value, selected.value),
	);
	// Each instrument gets a card of its own, made when it is picked: its timeline is drawn at its
	// own height, and its focus starts on its own first item. Node ids are only unique within one
	// report.
	const cardKey = computed(() =>
		selected.value === null ? "" : `${made.value}:${selected.value.node.id}`,
	);

	return {
		sections,
		selected,
		selectedEntry,
		startAt,
		entryCount,
		cardKey,
		select,
		show,
	};
}
