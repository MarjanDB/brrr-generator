<script setup lang="ts">
import type { ProvenanceNode } from "@brrr/lib";
import { Chart, type ChartConfiguration } from "chart.js/auto";
import { DateTime } from "luxon";
import { computed, onMounted, onUnmounted, useTemplateRef, watch } from "vue";
import { TickGranularity } from "~/download/timeline/TickGranularity";
import type { Timeline } from "~/download/timeline/Timeline";
import type { TimelineMark } from "~/download/timeline/TimelineMark";
import {
	type TimelineMarksPlugin,
	timelineMarksPlugin,
} from "~/download/timeline/timelineMarksPlugin";
import { paddedRange, timelineTicks } from "~/download/timeline/timelineTicks";

const props = defineProps<{
	timeline: Timeline;
	focus: ProvenanceNode;
	lit: ReadonlySet<ProvenanceNode> | null;
	locale: string;
	// The instrument's name for the screen reader
	name: string;
	// The tooltip text of a mark
	describe: (mark: TimelineMark) => string;
}>();

const emit = defineEmits<{
	select: [node: ProvenanceNode];
}>();

const { t } = useI18n();
const { colors } = useChartTheme();
const canvasRef = useTemplateRef<HTMLCanvasElement>("canvas");
let chart: Chart<"scatter"> | null = null;

const height = computed(() => 150 + 22 * Math.max(0, props.timeline.stackDepth - 1));
const arcTolerance = 6;

function buildConfig(plugin: TimelineMarksPlugin): ChartConfiguration<"scatter"> {
	const { timeline } = props;
	const range = paddedRange(timeline.first, timeline.last);
	const c = colors.value;
	const ticks = timelineTicks(timeline.first, timeline.last);
	const granularityAt = new Map(ticks.map((tick) => [tick.at, tick.granularity]));
	return {
		type: "scatter",
		data: {
			datasets: [
				{
					data: timeline.marks.map((mark) => ({ x: mark.at, y: -mark.stack })),
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
							const mark = timeline.marks[context.dataIndex];
							return mark === undefined ? "" : props.describe(mark);
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
						scale.ticks = ticks.map((tick) => ({ value: tick.at }));
					},
					ticks: {
						color: c.ticks,
						maxRotation: 0,
						autoSkip: false,
						callback: (value, index, scaleTicks) =>
							tickLabel(Number(value), scaleTicks[index - 1]?.value, granularityAt.get(Number(value))),
					},
				},
				y: {
					display: false,
					min: -(timeline.stackDepth - 1) - 1.5,
					max: 1.5,
				},
			},
			onClick: (event, elements) => {
				const element = elements[0];
				if (element !== undefined) {
					const mark = timeline.marks[element.index];
					if (mark !== undefined) {
						emit("select", mark.node);
					}
					return;
				}
				if (event.x === null || event.y === null) {
					return;
				}
				const arc = plugin.arcAt({ x: event.x, y: event.y }, arcTolerance);
				if (arc !== null) {
					emit("select", arc.lot);
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

// Month ticks read "Jan" (with the year when it changes), day ticks "10 Jan".
function tickLabel(
	value: number,
	previous: number | undefined,
	granularity: TickGranularity | undefined,
): string {
	const at = DateTime.fromMillis(value, { zone: "utc" });
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
		timeline: props.timeline,
		focus: props.focus,
		lit: props.lit,
		colors: colors.value,
	}));
	chart = new Chart(canvasRef.value, buildConfig(plugin));
}

onMounted(rebuild);
onUnmounted(() => {
	chart?.destroy();
	chart = null;
});

watch(
  () => [props.focus, props.lit],
  () => chart?.update("none"),
);
watch(() => props.timeline, rebuild);
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
