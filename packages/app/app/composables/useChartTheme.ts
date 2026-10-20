import { defaults } from "chart.js";
import { onMounted, ref } from "vue";

export type ChartThemeColors = {
	line: string;
	fill: string;
	grid: string;
	ticks: string;
	tooltipText: string;
	// The instrument timeline's marks, its arcs and the ring around the focus.
	bought: string;
	sold: string;
	corporateAction: string;
	dividend: string;
	tax: string;
	brokerLot: string;
	arc: string;
	focus: string;
	// The band behind the instrument timeline's tax year
	taxYear: string;
	// A label inside a solid bar of the timeline
	barLabel: string;
};

function cssVar(name: string): string {
	if (typeof window === "undefined") return "#888";
	return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function hexWithOpacity(hex: string, opacity: number): string {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	return `rgba(${r},${g},${b},${opacity})`;
}

function readColors(): ChartThemeColors {
	const line = cssVar("--color-accent-edge");
	const grid = hexWithOpacity(cssVar("--color-edge-strong"), 0.4);
	const ticks = cssVar("--color-ink-muted");
	const tooltipText = cssVar("--color-ink");
	return {
		line,
		fill: hexWithOpacity(line, 0.12),
		grid,
		ticks,
		tooltipText,
		bought: cssVar("--color-success-edge"),
		sold: cssVar("--color-danger-edge"),
		corporateAction: cssVar("--color-accent-edge"),
		dividend: cssVar("--color-warning-edge"),
		tax: cssVar("--color-warning-ink"),
		brokerLot: cssVar("--color-neutral-edge"),
		arc: cssVar("--color-info-edge"),
		focus: cssVar("--color-action-edge"),
		taxYear: cssVar("--color-surface-raised"),
		barLabel: cssVar("--color-page"),
	};
}

export function useChartTheme() {
	const colors = ref<ChartThemeColors>(readColors());

	onMounted(() => {
		colors.value = readColors();
		// The charts write in the page's font, not chart.js's own Helvetica. Set before the chart that
		// asked is built, since its onMounted runs after this one.
		defaults.font.family = getComputedStyle(document.body).fontFamily;
	});

	return { colors };
}
