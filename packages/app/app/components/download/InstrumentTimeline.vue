<script setup lang="ts">
import type { ProvenanceNode } from "@brrr/lib";
import { Chart, type ChartConfiguration } from "chart.js/auto";
import { DateTime } from "luxon";
import type { ReferenceElement } from "reka-ui";
import { computed, onMounted, onUnmounted, ref, shallowRef, useTemplateRef, watch } from "vue";
import { TimelineGeometry } from "~/composables/instrumentTimeline/timelineGeometry";
import type { TimelineMarksPlugin } from "~/composables/instrumentTimeline/timelineMarks";
import { TimelineMarks } from "~/composables/instrumentTimeline/timelineMarks";
import {
	TickGranularity,
	type TimelineMark,
	type TimelineRow,
	TimelineRowKind,
	type TimelineTick,
} from "~/types/timeline";
import { ButtonVariant, ControlSize } from "~/types/ui";

// The card's instrument over time, with the report's tax year shaded behind it. The card is made
// once per instrument, so the chart is built once it is mounted, at the height of its own rows. A
// click on a mark or a bar moves the focus there and offers its trace in a small card by the click.
const { t, locale } = useI18n();
const card = useInstrumentCard();
const { timeline, describeMark, describeRow, describeNode, focus, offered, showTrace } = card;
const { colors } = useChartTheme();
const { openProblemAt, sentenceOf } = useReportProblems();

// The marks a problem of the report still affects: each has a badge, and its tooltip adds the
// problem's sentence.
const flagged = computed(
	() =>
		new Set(
			timeline.value.marks
				.filter((mark) => openProblemAt(mark.node) !== null)
				.map((mark) => mark.node),
		),
);
function markText(mark: TimelineMark): string {
	const problem = openProblemAt(mark.node);
	return problem === null ? describeMark(mark) : `${describeMark(mark)}\n${sentenceOf(problem)}`;
}
const canvasRef = useTemplateRef<HTMLCanvasElement>("canvas");
let chart: Chart<"scatter"> | null = null;

// Folded, the rows follow the form: the lots of other years share one row, what is still open
// another. Spread, every bar has its own.
const spread = ref(false);
const rows = computed(() => TimelineGeometry.rows(timeline.value.bars, spread.value));
const foldable = computed(() => TimelineGeometry.isFoldable(timeline.value.bars));

const yRange = computed(() => TimelineGeometry.yRange(rows.value.length, timeline.value.stackDepth));
// The rows' height plus room for the axis's labels.
const height = computed(() =>
	Math.max(
		120,
		Math.round(30 + TimelineGeometry.rowPitch(rows.value.length) * (yRange.value.max - yRange.value.min)),
	),
);

// What the chart's own, invisible points stand for, so chart.js finds what is under the pointer
// and shows its tooltip: every point under the bars, each end of a bar, and each trade on the row
// of what is still open. A row of other years' lots has none: a click spreads it.
type HitTarget = { mark: TimelineMark; y: number };
function rowTargets(row: TimelineRow, y: number): HitTarget[] {
	switch (row.kind) {
		case TimelineRowKind.BAR:
			return row.bars.flatMap((bar) =>
				(bar.closed === null ? [bar.opened] : [bar.opened, bar.closed]).map((mark) => ({ mark, y })),
			);
		case TimelineRowKind.STILL_OPEN:
			return row.bars.map((bar) => ({ mark: bar.opened, y }));
		case TimelineRowKind.OTHER_YEARS:
			return [];
	}
}
const targets = computed<HitTarget[]>(() => {
	const drawn = rows.value;
	return [
		...timeline.value.points.map((point) => ({ mark: point.mark, y: TimelineGeometry.pointY(point.stack) })),
		...drawn.flatMap((row, index) => rowTargets(row, TimelineGeometry.barY(index, drawn.length))),
	];
});
// A mark is hit a little beyond its edge, and never through less than a fingertip.
const hitRadius = computed(() => Math.max(8, TimelineGeometry.markSize(TimelineGeometry.rowPitch(rows.value.length)) / 2 + 3));

// The point in the canvas the offered trace's card hangs on, kept to the canvas as the page scrolls.
const anchor = shallowRef<ReferenceElement | undefined>(undefined);
const offerOpen = computed({
	get: () => offered.value !== null,
	set: (open: boolean) => {
		if (!open) {
			card.dismissOffer();
		}
	},
});
const offerText = computed(() => (offered.value === null ? "" : describeNode(offered.value)));

// A point of the canvas, kept to the canvas as the page scrolls, for a tooltip or a card to hang on.
function canvasPoint(x: number, y: number): ReferenceElement | undefined {
	const canvas = canvasRef.value;
	if (canvas === null) {
		return undefined;
	}
	return {
		getBoundingClientRect: () => {
			const box = canvas.getBoundingClientRect();
			return new DOMRect(box.left + x, box.top + y, 0, 0);
		},
	};
}

// The mark under the pointer: what its tooltip says and where its centre is in the canvas.
const hovered = shallowRef<{ text: string; x: number; y: number } | null>(null);
const hoverAnchor = computed(() =>
	hovered.value === null ? undefined : canvasPoint(hovered.value.x, hovered.value.y),
);

function focusAndOffer(node: ProvenanceNode, x: number, y: number) {
	focus.refocus(node);
	const point = canvasPoint(x, y);
	if (point === undefined) {
		return;
	}
	anchor.value = point;
	card.offerTrace(node);
}

function buildConfig(plugin: TimelineMarksPlugin): ChartConfiguration<"scatter"> {
	const drawn = timeline.value;
	const hits = targets.value;
	const range = TimelineGeometry.paddedRange(drawn.first, drawn.last);
	const c = colors.value;
	// Laid out again for the axis's width whenever the chart is, a resize included.
	let tickList: TimelineTick[] = [];
	return {
		type: "scatter",
		data: {
			datasets: [
				{
					data: hits.map((target) => ({ x: target.mark.at, y: target.y })),
					pointRadius: hitRadius.value,
					pointStyle: "circle",
					backgroundColor: "transparent",
					borderColor: "transparent",
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			animation: false,
			plugins: {
				legend: { display: false },
				// chart.js finds the mark under the pointer; the tooltip itself is the app's own, hung on it.
				tooltip: {
					enabled: false,
					// The card a click opens says what the tooltip would.
					filter: () => offered.value === null,
					external: ({ tooltip }) => {
						const point = tooltip.dataPoints?.[0];
						const target = point === undefined ? undefined : hits[point.dataIndex];
						hovered.value =
							tooltip.opacity === 0 || target === undefined
								? null
								: { text: markText(target.mark), x: tooltip.caretX, y: tooltip.caretY };
					},
				},
			},
			scales: {
				x: {
					type: "linear",
					min: range.min,
					max: range.max,
					grid: { color: c.grid },
					border: { color: c.grid },
					afterBuildTicks: (scale) => {
						tickList = TimelineGeometry.ticks(drawn.first, drawn.last, scale.width);
						scale.ticks = tickList.map((tick) => ({ value: tick.at }));
					},
					ticks: {
						color: c.ticks,
						maxRotation: 0,
						autoSkip: false,
						callback: (value, index, scaleTicks) =>
							tickLabel(
								Number(value),
								scaleTicks[index - 1]?.value,
								tickList.find((tick) => tick.at === Number(value))?.granularity,
							),
					},
				},
				y: {
					display: false,
					min: yRange.value.min,
					max: yRange.value.max,
				},
			},
			onClick: (event, elements) => {
				const element = elements[0];
				if (element !== undefined) {
					const target = hits[element.index];
					if (target !== undefined) {
						focusAndOffer(target.mark.node, element.element.x, element.element.y);
					}
					return;
				}
				if (event.x === null || event.y === null) {
					return;
				}
				// A lot's bar focuses the lot; what is still open, the trade that opened it. A folded
				// row spreads. A click on nothing lets go of the lit chain, as in the graph.
				const row = plugin.rowAt({ x: event.x, y: event.y });
				const bar = row?.kind === TimelineRowKind.BAR ? row.bars[0] : undefined;
				if (bar !== undefined) {
					focusAndOffer(bar.lot ?? bar.opened.node, event.x, event.y);
				} else if (row !== null) {
					spread.value = true;
				} else {
					focus.clearLight();
				}
			},
			onHover: (event, elements, hovered) => {
				const overBar =
					elements.length === 0 && event.x !== null && event.y !== null
						? plugin.rowAt({ x: event.x, y: event.y }) !== null
						: false;
				hovered.canvas.style.cursor = elements.length > 0 || overBar ? "pointer" : "default";
			},
		},
		plugins: [plugin],
	};
}

// Year ticks read "2024", month ticks "Jan" (with the year when it changes), day ticks "10 Jan".
function tickLabel(
	value: number,
	previous: number | undefined,
	granularity: TickGranularity | undefined,
): string {
	const at = DateTime.fromMillis(value, { zone: "utc" });
	if (granularity === TickGranularity.YEAR) {
		return new Intl.DateTimeFormat(locale.value, { year: "numeric", timeZone: "UTC" }).format(value);
	}
	if (granularity === TickGranularity.DAY) {
		return new Intl.DateTimeFormat(locale.value, {
			day: "numeric",
			month: "short",
			timeZone: "UTC",
		}).format(value);
	}
	const yearChanged =
		previous === undefined || DateTime.fromMillis(previous, { zone: "utc" }).year !== at.year;
	return new Intl.DateTimeFormat(locale.value, {
		month: "short",
		...(yearChanged ? { year: "numeric" } : {}),
		timeZone: "UTC",
	}).format(value);
}

function rebuild() {
	chart?.destroy();
	chart = null;
	if (canvasRef.value === null) {
		return;
	}
	const plugin = TimelineMarks.plugin(() => ({
		timeline: timeline.value,
		rows: rows.value,
		focus: focus.node.value,
		lit: focus.lit.value?.sources ?? null,
		colors: colors.value,
		year: card.year,
		describeRow,
		flagged: flagged.value,
	}));
	chart = new Chart(canvasRef.value, buildConfig(plugin));
}

onMounted(rebuild);
onUnmounted(() => {
	chart?.destroy();
	chart = null;
});

watch(
  () => [focus.node.value, focus.lit.value],
  () => chart?.update("none"),
);
watch(colors, rebuild);
// Folding changes the rows and the height: the chart is built again once the page has the new one.
watch(spread, rebuild, { flush: "post" });
</script>

<template>
  <div class="relative w-full" :style="{ height: `${height}px` }">
    <AppTooltip
      :content="hovered?.text ?? ''"
      :open="hovered !== null"
      :reference="hoverAnchor"
      :side-offset="hitRadius"
    >
      <canvas
        ref="canvas"
        role="img"
        :aria-label="t('download_timeline_label', { name: card.name })"
        class="w-full h-full"
      />
    </AppTooltip>
  </div>
  <div v-if="foldable" class="flex justify-end -mt-1 mb-1">
    <AppButton
      :variant="ButtonVariant.QUIET"
      :size="ControlSize.SM"
      :aria-pressed="spread"
      @click="spread = !spread"
    >
      {{ spread ? t('download_timeline_fold') : t('download_timeline_spread') }}
    </AppButton>
  </div>
  <AppPopover
    v-model:open="offerOpen"
    :reference="anchor"
    side="bottom"
    align="center"
    :aria-label="offerText"
    class="w-64"
  >
    <p class="text-body">{{ offerText }}</p>
    <AppButton :size="ControlSize.SM" class="mt-2" @click="offered !== null && showTrace(offered)">
      <span class="i-mdi-graph-outline" aria-hidden="true" />
      {{ t('download_view_trace') }}
    </AppButton>
  </AppPopover>
</template>
