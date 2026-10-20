<script setup lang="ts">
import { Chart, type ChartConfiguration } from "chart.js/auto";
import { DateTime } from "luxon";
import { computed, onMounted, onUnmounted, ref, useTemplateRef, watch } from "vue";
import {
	TickGranularity,
	type TimelineMark,
	type TimelineRow,
	TimelineRowKind,
	type TimelineTick,
} from "~/types/timeline";
import {
	barY,
	isFoldable,
	markSize,
	paddedRange,
	pointY,
	rowPitch,
	timelineRows,
	timelineTicks,
	timelineYRange,
} from "~/utils/instrumentTimeline";
import { type TimelineMarksPlugin, timelineMarksPlugin } from "~/utils/timelineMarksPlugin";

// The card's instrument over time, with the report's tax year shaded behind it. The card is made
// once per instrument, so the chart is built once it is mounted, at the height of its own rows.
const { t, locale } = useI18n();
const card = useInstrumentCard();
const { timeline, describeMark, describeRow, focus } = card;
const { colors } = useChartTheme();
const canvasRef = useTemplateRef<HTMLCanvasElement>("canvas");
let chart: Chart<"scatter"> | null = null;

// Folded, the rows follow the form: the lots of other years share one row, what is still open
// another. Spread, every bar has its own.
const spread = ref(false);
const rows = computed(() => timelineRows(timeline.value.bars, spread.value));
const foldable = computed(() => isFoldable(timeline.value.bars));

const yRange = computed(() => timelineYRange(rows.value.length, timeline.value.stackDepth));
// The rows' height plus room for the axis's labels.
const height = computed(() =>
	Math.max(
		120,
		Math.round(30 + rowPitch(rows.value.length) * (yRange.value.max - yRange.value.min)),
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
		...timeline.value.points.map((point) => ({ mark: point.mark, y: pointY(point.stack) })),
		...drawn.flatMap((row, index) => rowTargets(row, barY(index, drawn.length))),
	];
});
// A mark is hit a little beyond its edge, and never through less than a fingertip.
const hitRadius = computed(() => Math.max(8, markSize(rowPitch(rows.value.length)) / 2 + 3));

function buildConfig(plugin: TimelineMarksPlugin): ChartConfiguration<"scatter"> {
	const drawn = timeline.value;
	const hits = targets.value;
	const range = paddedRange(drawn.first, drawn.last);
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
				tooltip: {
					backgroundColor: c.tooltipBg,
					bodyColor: c.tooltipText,
					borderColor: c.grid,
					borderWidth: 1,
					displayColors: false,
					callbacks: {
						title: () => "",
						label: (context) => {
							const target = hits[context.dataIndex];
							return target === undefined ? "" : describeMark(target.mark);
						},
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
						tickList = timelineTicks(drawn.first, drawn.last, scale.width);
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
						focus.refocus(target.mark.node);
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
					focus.refocus(bar.lot ?? bar.opened.node);
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
	const plugin = timelineMarksPlugin(() => ({
		timeline: timeline.value,
		rows: rows.value,
		focus: focus.node.value,
		lit: focus.lit.value?.sources ?? null,
		colors: colors.value,
		year: card.year,
		describeRow,
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
    <canvas
      ref="canvas"
      role="img"
      :aria-label="t('download_timeline_label', { name: card.name })"
      class="w-full h-full"
    />
  </div>
  <div v-if="foldable" class="flex justify-end -mt-1 mb-1">
    <AppButton ghost class="px-2 py-0.5 text-xs" :aria-pressed="spread" @click="spread = !spread">
      {{ spread ? t('download_timeline_fold') : t('download_timeline_spread') }}
    </AppButton>
  </div>
</template>
