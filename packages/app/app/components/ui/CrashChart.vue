<script setup lang="ts">
const props = defineProps<{
	// Without motion it shows one moment of the crash, for people who ask for reduced motion.
	animated: boolean;
}>();

// The crash behind her: a red candle chart that keeps falling while the view follows it. One stretch of
// it, 300 across and 270 down in the chart's units, was placed by hand in the chart editor: the price at
// the end of each candle. The chart draws three stretches: the first two stand finished, and the third
// forms one candle per equal slice of the cycle while the view steps one stretch down the crash, so each
// cycle ends where it began.
const stretch: { w: number; h: number; points: [number, number][] } = {
	w: 300,
	h: 270,
	points: [
		[0, 0],
		[16.7, 53.3],
		[33.3, 50],
		[50, 61.1],
		[66.7, 70.3],
		[83.3, 68.7],
		[100, 72.6],
		[116.7, 106.8],
		[133.3, 119.6],
		[150, 121.7],
		[166.7, 142],
		[183.3, 139.5],
		[200, 146.4],
		[216.7, 165.7],
		[233.3, 205.7],
		[250, 207.8],
		[266.7, 235.9],
		[283.3, 239.2],
		[300, 270],
	],
};
const cycle = "5.5s";
// Where the forming stretch starts in the chart's box when a cycle begins.
const start: [number, number] = [400, 330];
const offset = `translate(${start[0] - 2 * stretch.w} ${start[1] - 2 * stretch.h})`;

// Like a live candlestick chart (Highcharts' live demo): each candle opens at the last close and its
// price then moves in ten sudden ticks, the wicks stretching to the highest and lowest price reached,
// until it closes. Every candle here is red, so each closes below its open: at the editor's price for
// that tick, or a little below the last close where the editor's line rose.
type Candle = { x: number; open: number; close: number; high: number; low: number; prices: number[] };

const spacing = stretch.w / (stretch.points.length - 1);
const bodyWidth = spacing * 0.62;
const pricesPerCandle = 10;

// A fixed random source (mulberry32), so the chart is the same on the server and on every visit.
let seed = 7;
const random = () => {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// The candle's ten prices: a random walk from its open, bent to end exactly at its close. In the chart's
// units a higher number is a lower price.
const walk = (open: number, close: number) => {
	const size = 2 + 0.35 * (close - open);
	const steps = [0];
	for (let tick = 1; tick < pricesPerCandle; tick++) {
		steps.push((steps[tick - 1] ?? 0) + size * (random() + random() + random() - 1.5));
	}
	const last = steps[pricesPerCandle - 1] ?? 0;
	return steps.map(
		(step, tick) => open + ((close - open) * tick) / (pricesPerCandle - 1) + step - (last * tick) / (pricesPerCandle - 1),
	);
};

let lastClose = 0;
const stretchCandles: Candle[] = stretch.points.slice(1).map(([x, price]) => {
	const open = lastClose;
	const close = Math.max(price, open + 2);
	lastClose = close;
	const prices = walk(open, close);
	return { x: x - spacing / 2, open, close, high: Math.min(...prices), low: Math.max(...prices), prices };
});
const shifted = (candle: Candle, stretches: number): Candle => ({
	x: candle.x + stretches * stretch.w,
	open: candle.open + stretches * stretch.h,
	close: candle.close + stretches * stretch.h,
	high: candle.high + stretches * stretch.h,
	low: candle.low + stretches * stretch.h,
	prices: candle.prices.map((price) => price + stretches * stretch.h),
});
const finished = [0, 1].flatMap((stretches) => stretchCandles.map((candle) => shifted(candle, stretches)));

// Each candle gets an equal slice of the cycle. The view holds still while the slice's candle forms,
// then in the slice's last tenth slides over by one candle's step down the crash, so after the last
// slice it has moved one whole stretch.
const slices = stretchCandles.length;
const time = (slice: number) => (slice / slices).toFixed(4);
const step = { x: stretch.w / slices, y: stretch.h / slices };
const panTimes = ["0"];
const panValues = ["0 0"];
for (let index = 0; index < slices; index++) {
	panTimes.push(time(index + 0.9), time(index + 1));
	panValues.push(
		`${-index * step.x} ${-index * step.y}`,
		`${-(index + 1) * step.x} ${-(index + 1) * step.y}`,
	);
}
const panKeyTimes = panTimes.join(";");
const panKeyValues = panValues.join(";");

// The forming stretch: candle i shows up at its open when its slice begins and takes its ten prices one
// by one over the slice's first eight tenths, each a sudden jump: its body runs from the open to the
// latest price, its wick from the highest to the lowest price so far. Then it stands.
const tickTimes = (index: number) =>
	Array.from({ length: pricesPerCandle }, (_, tick) => time(index + (0.81 * tick) / (pricesPerCandle - 1)));
const numbers = (values: number[]) => values.map((value) => value.toFixed(2)).join(";");
const forming = stretchCandles.map((candle, index) => {
	const at = shifted(candle, 2);
	const tops: number[] = [];
	const bottoms: number[] = [];
	const highs: number[] = [];
	const lows: number[] = [];
	at.prices.forEach((price, tick) => {
		const sofar = at.prices.slice(0, tick + 1);
		tops.push(Math.min(at.open, price));
		bottoms.push(Math.max(at.open, price));
		highs.push(Math.min(...sofar));
		lows.push(Math.max(...sofar));
	});
	return {
		...at,
		showTimes: `0;${time(index)}`,
		tickTimes: ["0", ...tickTimes(index)].join(";"),
		bodyTop: numbers([at.open, ...tops]),
		bodyHeight: numbers([0, ...tops.map((top, tick) => Math.max(0.8, (bottoms[tick] ?? top) - top))]),
		wickTop: numbers([at.open, ...highs]),
		wickBottom: numbers([at.open, ...lows]),
	};
});


// Ids are per instance: the layout holds a moving and a still copy.
const id = useId();
const gridId = `${id}-grid`;
const gridFadeId = `${id}-grid-fade`;
const gridMaskId = `${id}-grid-mask`;

// The red is the artwork's, not a colour role.
const red = "rgb(230 45 45)";
const glow = { filter: "drop-shadow(0 0 5px rgb(255 40 35 / 0.6))" };
// The oldest candles fade out towards the top left of the chart's plane.
const fade = { maskImage: "linear-gradient(135deg, transparent 8%, black 42%)" };
</script>

<template>
	<!-- The parent decides whether it shows (display), so the moving and the still copy can swap. -->
	<svg viewBox="0 0 466 414" preserveAspectRatio="none" class="h-full w-full overflow-visible" :style="fade" aria-hidden="true">
		<defs>
			<radialGradient :id="gridFadeId" cx="45%" cy="50%" r="60%">
				<stop offset="0.55" stop-color="white" />
				<stop offset="1" stop-color="black" />
			</radialGradient>
			<mask :id="gridMaskId">
				<rect width="466" height="414" :fill="`url(#${gridFadeId})`" />
			</mask>
			<pattern :id="gridId" :width="stretch.w / 5" :height="stretch.h / 5" patternUnits="userSpaceOnUse">
				<path :d="`M${stretch.w / 5},0 H0 V${stretch.h / 5}`" fill="none" stroke-width="1" class="stroke-edge-strong opacity-50" />
			</pattern>
		</defs>

		<g :mask="`url(#${gridMaskId})`">
			<g :transform="offset">
				<g>
					<animateTransform v-if="props.animated" attributeName="transform" type="translate" :values="panKeyValues" :keyTimes="panKeyTimes" :dur="cycle" repeatCount="indefinite" />
					<rect :x="-stretch.w" :y="-stretch.h" :width="stretch.w * 5" :height="stretch.h * 5" :fill="`url(#${gridId})`" />
				</g>
			</g>
		</g>

		<g :transform="offset">
			<g :style="glow">
				<animateTransform v-if="props.animated" attributeName="transform" type="translate" :values="panKeyValues" :keyTimes="panKeyTimes" :dur="cycle" repeatCount="indefinite" />
				<g v-for="(candle, index) in finished" :key="`finished-${index}`">
					<line :x1="candle.x" :x2="candle.x" :y1="candle.high" :y2="candle.low" :stroke="red" stroke-width="1.5" />
					<rect :x="candle.x - bodyWidth / 2" :y="candle.open" :width="bodyWidth" :height="candle.close - candle.open" :fill="red" />
				</g>
				<template v-if="props.animated">
					<g v-for="(candle, index) in forming" :key="`forming-${index}`">
						<animate attributeName="opacity" values="0;1" :keyTimes="candle.showTimes" calcMode="discrete" :dur="cycle" repeatCount="indefinite" />
						<line :x1="candle.x" :x2="candle.x" :y1="candle.open" :y2="candle.open" :stroke="red" stroke-width="1.5">
							<animate attributeName="y1" :values="candle.wickTop" :keyTimes="candle.tickTimes" calcMode="discrete" :dur="cycle" repeatCount="indefinite" />
							<animate attributeName="y2" :values="candle.wickBottom" :keyTimes="candle.tickTimes" calcMode="discrete" :dur="cycle" repeatCount="indefinite" />
						</line>
						<rect :x="candle.x - bodyWidth / 2" :y="candle.open" :width="bodyWidth" height="0" :fill="red">
							<animate attributeName="y" :values="candle.bodyTop" :keyTimes="candle.tickTimes" calcMode="discrete" :dur="cycle" repeatCount="indefinite" />
							<animate attributeName="height" :values="candle.bodyHeight" :keyTimes="candle.tickTimes" calcMode="discrete" :dur="cycle" repeatCount="indefinite" />
						</rect>
					</g>
				</template>
			</g>
		</g>
	</svg>
</template>
