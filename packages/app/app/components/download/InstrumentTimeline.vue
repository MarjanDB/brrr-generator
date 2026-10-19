<script setup lang="ts">
import type { ProvenanceWalker, ReportInstrument } from "@brrr/lib";
import { Chart, type ChartConfiguration } from "chart.js/auto";
import { DateTime } from "luxon";
import { computed, onMounted, onUnmounted, useTemplateRef, watch } from "vue";
import { TickGranularity, type TimelineTick } from "~/types/timeline";
import { paddedRange, timelineTicks } from "~/utils/instrumentTimeline";
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
const { timeline, describeMark } = useInstrumentTimeline(
	() => props.instrument,
	() => props.walker,
);
const { colors } = useChartTheme();
const canvasRef = useTemplateRef<HTMLCanvasElement>("canvas");
let chart: Chart<"scatter"> | null = null;

const height = computed(() => 150 + 22 * Math.max(0, timeline.value.stackDepth - 1));
const arcTolerance = 6;

function buildConfig(plugin: TimelineMarksPlugin): ChartConfiguration<"scatter"> {
	const drawn = timeline.value;
	const range = paddedRange(drawn.first, drawn.last);
	const c = colors.value;
	// Laid out again for the axis's width whenever the chart is, a resize included.
	let tickList: TimelineTick[] = [];
	return {
		type: "scatter",
		data: {
			datasets: [
				{
					data: drawn.marks.map((mark) => ({ x: mark.at, y: -mark.stack })),
					pointRadius: 11,
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
							const mark = drawn.marks[context.dataIndex];
							return mark === undefined ? "" : describeMark(mark);
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
					min: -(drawn.stackDepth - 1) - 1.5,
					max: 1.5,
				},
			},
			onClick: (event, elements) => {
				const element = elements[0];
				if (element !== undefined) {
					const mark = drawn.marks[element.index];
					if (mark !== undefined) {
						focus.refocus(mark.node);
					}
					return;
				}
				if (event.x === null || event.y === null) {
					return;
				}
				const arc = plugin.arcAt({ x: event.x, y: event.y }, arcTolerance);
				if (arc !== null) {
					focus.refocus(arc.lot);
				}
			},
			onHover: (event, elements, hovered) => {
				const overArc =
					elements.length === 0 && event.x !== null && event.y !== null
						? plugin.arcAt({ x: event.x, y: event.y }, arcTolerance) !== null
						: false;
				hovered.canvas.style.cursor = elements.length > 0 || overArc ? "pointer" : "default";
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
