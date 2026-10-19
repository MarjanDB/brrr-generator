<script setup lang="ts">
import type { ProvenanceWalker, ReportInstrument } from "@brrr/lib";
import { Chart, type ChartConfiguration } from "chart.js/auto";
import { DateTime } from "luxon";
import { computed, onMounted, onUnmounted, useTemplateRef, watch } from "vue";
import { TickGranularity, type TimelineMark, type TimelineTick } from "~/types/timeline";
import {
	barY,
	markSize,
	paddedRange,
	pointY,
	rowPitch,
	timelineTicks,
	timelineYRange,
} from "~/utils/instrumentTimeline";
import { type TimelineMarksPlugin, timelineMarksPlugin } from "~/utils/timelineMarksPlugin";

const props = defineProps<{
	instrument: ReportInstrument;
	walker: ProvenanceWalker;
	locale: string;
	// The instrument's name for the screen reader
	name: string;
	// The report's tax year, shaded behind the marks
	year: number;
}>();

const { t } = useI18n();
const focus = useGraphFocus();
const { timeline, describeMark, describeBar } = useInstrumentTimeline(
	() => props.instrument,
	() => props.walker,
);
const { colors } = useChartTheme();
const canvasRef = useTemplateRef<HTMLCanvasElement>("canvas");
let chart: Chart<"scatter"> | null = null;

const yRange = computed(() =>
	timelineYRange(timeline.value.bars.length, timeline.value.stackDepth),
);
// The rows' height plus room for the axis's labels.
const height = computed(() =>
	Math.max(
		120,
		Math.round(30 + rowPitch(timeline.value.bars.length) * (yRange.value.max - yRange.value.min)),
	),
);

// What the chart's own, invisible points stand for, so chart.js finds what is under the pointer
// and shows its tooltip: every point under the bars, and each end of a bar.
type HitTarget = { mark: TimelineMark; y: number };
const targets = computed<HitTarget[]>(() => {
	const drawn = timeline.value;
	return [
		...drawn.points.map((point) => ({ mark: point.mark, y: pointY(point.stack) })),
		...drawn.bars.flatMap((bar, index) => {
			const y = barY(index, drawn.bars.length);
			const ends = bar.closed === null ? [bar.opened] : [bar.opened, bar.closed];
			return ends.map((mark) => ({ mark, y }));
		}),
	];
});
// A mark is hit a little beyond its edge, and never through less than a fingertip.
const hitRadius = computed(() =>
	Math.max(8, markSize(rowPitch(timeline.value.bars.length)) / 2 + 3),
);

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
				// A lot's bar focuses the lot; what is still open, the trade that opened it. A click on
				// nothing lets go of the lit chain, as in the graph.
				const bar = plugin.barAt({ x: event.x, y: event.y });
				if (bar !== null) {
					focus.refocus(bar.lot ?? bar.opened.node);
				} else {
					focus.clearLight();
				}
			},
			onHover: (event, elements, hovered) => {
				const overBar =
					elements.length === 0 && event.x !== null && event.y !== null
						? plugin.barAt({ x: event.x, y: event.y }) !== null
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
		return new Intl.DateTimeFormat(props.locale, { year: "numeric", timeZone: "UTC" }).format(value);
	}
	if (granularity === TickGranularity.DAY) {
		return new Intl.DateTimeFormat(props.locale, {
			day: "numeric",
			month: "short",
			timeZone: "UTC",
		}).format(value);
	}
	const yearChanged =
		previous === undefined || DateTime.fromMillis(previous, { zone: "utc" }).year !== at.year;
	return new Intl.DateTimeFormat(props.locale, {
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
		focus: focus.node.value,
		lit: focus.lit.value?.sources ?? null,
		colors: colors.value,
		year: props.year,
		describeBar,
	}));
	chart = new Chart(canvasRef.value, buildConfig(plugin));
}

onMounted(rebuild);
onUnmounted(() => {
	chart?.destroy();
	chart = null;
});

watch(
  () => [focus.node.value, focus.lit.value, props.year],
  () => chart?.update("none"),
);
watch(timeline, rebuild);
watch(colors, rebuild);
</script>

<template>
  <div class="relative w-full" :style="{ height: `${height}px` }">
    <canvas
      ref="canvas"
      role="img"
      :aria-label="t('download_timeline_label', { name })"
      class="w-full h-full"
    />
  </div>
</template>
