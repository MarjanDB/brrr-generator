import { onMounted, onUnmounted, ref } from "vue";

export type ChartThemeColors = {
	line: string;
	fill: string;
	grid: string;
	ticks: string;
	tooltipBg: string;
	tooltipText: string;
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
	const line = cssVar("--secondary-600");
	const grid = hexWithOpacity(cssVar("--stale-300"), 0.4);
	const ticks = cssVar("--stale-550");
	const tooltipBg = cssVar("--stale-100");
	const tooltipText = cssVar("--stale-900");
	return { line, fill: hexWithOpacity(line, 0.12), grid, ticks, tooltipBg, tooltipText };
}

export function useChartTheme() {
	const colors = ref<ChartThemeColors>(readColors());

	if (typeof window !== "undefined") {
		const observer = new MutationObserver(() => {
			colors.value = readColors();
		});

		onMounted(() => {
			observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
			colors.value = readColors();
		});

		onUnmounted(() => observer.disconnect());
	}

	return { colors };
}
