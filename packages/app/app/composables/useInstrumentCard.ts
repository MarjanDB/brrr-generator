import type {
	ProvenanceGraph,
	ProvenanceNode,
	ProvenanceWalker,
	ProvenanceWarning,
	ReportLeftOut,
	ReportProvenance,
	TaxAuthorityLotMatchingMethod,
} from "@brrr/lib";
import type { ComputedRef, InjectionKey } from "vue";
import type { PanelEntry } from "~/types/instrumentPanel";
import type { Timeline, TimelineBar, TimelineMark } from "~/types/timeline";

export type InstrumentCardArgs = {
	entry: PanelEntry;
	reading: ReportProvenance;
	walker: ProvenanceWalker;
	// The report's provenance graph, which includes the import's.
	graph: ProvenanceGraph;
	year: number;
	lotMatchingMethod: TaxAuthorityLotMatchingMethod;
	// The form as the graph's popovers name it.
	formName: string;
};

// What every part of one instrument's card reads: the instrument and its report, its timeline,
// the focus inside the card, and what the report says about the focused item.
export type InstrumentCardState = InstrumentCardArgs & {
	// An option's OCC symbol, else the ticker: what the timeline and the graph's caption call it.
	name: string;
	timeline: ComputedRef<Timeline>;
	describeMark: (mark: TimelineMark) => string;
	describeBar: (bar: TimelineBar) => string;
	// What the timeline draws: the only things a click in the graph can make the focus.
	focusable: ComputedRef<ReadonlySet<ProvenanceNode>>;
	focus: GraphFocus;
	leftOut: ComputedRef<ReportLeftOut[]>;
	warnings: ComputedRef<ProvenanceWarning[]>;
};

const instrumentCardKey: InjectionKey<InstrumentCardState> = Symbol("InstrumentCard");

// Creates one instrument's card and hands it, and the focus inside it, to every part of the card.
// The card is made once per instrument (its component is keyed by it), so its timeline is built
// once, and every part starts fresh when another instrument is picked.
export function provideInstrumentCard(args: InstrumentCardArgs): InstrumentCardState {
	const instrument = args.entry.instrument;
	const { timeline, describeMark, describeBar } = useInstrumentTimeline(
		() => instrument,
		() => args.walker,
	);
	const focus = provideGraphFocus();
	focus.start(defaultFocus(instrument, args.walker));
	const card: InstrumentCardState = {
		...args,
		name: args.entry.contract?.occSymbol ?? args.entry.ticker,
		timeline,
		describeMark,
		describeBar,
		focusable: computed(() => focusableOf(timeline.value)),
		focus,
		leftOut: computed(() =>
			focus.node.value === null ? [] : leftOutOf(instrument, focus.node.value),
		),
		warnings: computed(() =>
			focus.node.value === null ? [] : warningsOf(instrument, focus.node.value),
		),
	};
	provide(instrumentCardKey, card);
	return card;
}

// The card an ancestor provided.
export function useInstrumentCard(): InstrumentCardState {
	const card = inject(instrumentCardKey, null);
	if (card === null) {
		throw new Error("useInstrumentCard: no ancestor called provideInstrumentCard");
	}
	return card;
}
