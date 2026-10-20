import type {
	ProvenanceGraph,
	ProvenanceNode,
	ProvenanceWalker,
	ProvenanceWarning,
	ReportLeftOut,
	ReportProvenance,
	TaxAuthorityLotMatchingMethod,
} from "@brrr/lib";
import type { ComputedRef, InjectionKey, Ref } from "vue";
import {
	type DetectedPartText,
	DetectedReason,
	type DetectedRow,
	type FormLot,
	InstrumentCardTab,
} from "~/types/instrumentCard";
import type { PanelEntry } from "~/types/instrumentPanel";
import type { Timeline, TimelineBar, TimelineMark, TimelineRow } from "~/types/timeline";

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
	// The form as the tax authority calls it, which the reasons in "Everything detected" name.
	formCode: string;
};

// What every part of one instrument's card reads: the instrument and its report, its timeline,
// the focus inside the card, what the report says about the focused item, and the tabs under the
// timeline.
export type InstrumentCardState = InstrumentCardArgs & {
	// An option's OCC symbol, else the ticker: what the timeline and the graph's caption call it.
	name: string;
	timeline: ComputedRef<Timeline>;
	describeMark: (mark: TimelineMark) => string;
	describeRow: (row: TimelineRow) => string;
	describeQuantity: (quantity: number) => string;
	describeHeld: (bar: TimelineBar) => string;
	describeWhat: (mark: TimelineMark) => string;
	describeNode: (node: ProvenanceNode) => string;
	// What the timeline draws: the only things a click in the graph can make the focus.
	focusable: ComputedRef<ReadonlySet<ProvenanceNode>>;
	focus: GraphFocus;
	leftOut: ComputedRef<ReportLeftOut[]>;
	warnings: ComputedRef<ProvenanceWarning[]>;
	// The rows of the tabs under the timeline: the lots on the form, a dividend payer's payments on
	// it, and everything detected for the instrument.
	formLots: ComputedRef<FormLot[]>;
	// The net change of the lots on the form, in the base currency.
	formTotal: ComputedRef<number>;
	formPayments: ComputedRef<TimelineMark[]>;
	detected: ComputedRef<DetectedRow[]>;
	// Why a row of "Everything detected" is, or isn't, on the form, one verdict per reason.
	describeParts: (row: DetectedRow) => DetectedPartText[];
	tab: Ref<InstrumentCardTab>;
	// Moves the focus to a node and opens the Trace tab on it.
	showTrace: (node: ProvenanceNode) => void;
};

const instrumentCardKey: InjectionKey<InstrumentCardState> = Symbol("InstrumentCard");

// Creates one instrument's card and hands it, and the focus inside it, to every part of the card.
// The card is made once per instrument (its component is keyed by it), so its timeline is built
// once, and every part starts fresh when another instrument is picked.
export function provideInstrumentCard(args: InstrumentCardArgs): InstrumentCardState {
	const instrument = args.entry.instrument;
	const { t, locale } = useI18n();
	const { dropSentence } = useProvenanceText();
	const {
		timeline,
		describeQuantity,
		describeMark,
		describeRow,
		describeHeld,
		describeWhat,
		describeNode,
	} = useInstrumentTimeline(
		() => instrument,
		() => args.walker,
	);
	const focus = provideGraphFocus();
	focus.start(defaultFocus(instrument, args.walker));
	const tab = ref(InstrumentCardTab.ON_THE_FORM);
	const formLots = computed(() => formLotsOf(instrument, timeline.value));

	// A trade split between reasons says how much of it each covers. A reason the report gave
	// itself says the report's sentences.
	function describeParts(row: DetectedRow): DetectedPartText[] {
		const split = row.parts.length > 1;
		const sentences = row.leftOut.map((item) => dropSentence(item.drop));
		const years = (values: number[]) =>
			new Intl.ListFormat(locale.value, { type: "conjunction" }).format(values.map(String));
		return row.parts.map((part) => {
			const detail =
				part.reason === DetectedReason.LEFT_OUT && sentences.length > 0
					? sentences.join(" ")
					: t((split ? detectedPartKeys : detectedDetailKeys)[part.reason], {
							form: args.formCode,
							year: String(args.year),
							years: years(part.years),
							quantity: part.quantity === null ? "" : describeQuantity(part.quantity),
						});
			return { reason: part.reason, verdict: t(detectedVerdictKeys[part.reason]), detail };
		});
	}
	const card: InstrumentCardState = {
		...args,
		name: args.entry.contract?.occSymbol ?? args.entry.ticker,
		timeline,
		describeMark,
		describeRow,
		describeQuantity,
		describeHeld,
		describeWhat,
		describeNode,
		focusable: computed(() => focusableOf(timeline.value)),
		focus,
		leftOut: computed(() =>
			focus.node.value === null ? [] : leftOutOf(instrument, focus.node.value),
		),
		warnings: computed(() =>
			focus.node.value === null ? [] : warningsOf(instrument, focus.node.value),
		),
		formLots,
		formTotal: computed(() => formTotalOf(formLots.value)),
		formPayments: computed(() => formPaymentsOf(timeline.value)),
		detected: computed(() => detectedRowsOf(instrument, timeline.value, args.year)),
		describeParts,
		tab,
		showTrace: (node) => {
			focus.refocus(node);
			tab.value = InstrumentCardTab.TRACE;
		},
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
