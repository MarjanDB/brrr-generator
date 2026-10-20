<script setup lang="ts">
const { t } = useI18n();

const drawing = "/images/fx-warrior.webp";

// Where the screen's light can't reach: the monitor's back, its stand, and everything under the desk.
// Outlined by hand, in percent of the drawing's width and height. A shape that meets the drawing's edge
// runs 10% past it, so the blur below doesn't let light leak in along the edge.
const shadows: [number, number][][] = [
	[
		[-10, 30.8],
		[0, 30.8],
		[45.1, 41.4],
		[47.8, 62.7],
		[46.4, 63.5],
		[0, 50.2],
		[-10, 50.2],
	],
	[
		[-10, 67.4],
		[0, 67.4],
		[55.4, 85.4],
		[100, 51.9],
		[110, 51.9],
		[110, 110],
		[-10, 110],
	],
	[
		[14.3, 54.7],
		[18.3, 67.1],
		[10.3, 64.8],
		[5.1, 51.5],
	],
];

// Opaque everywhere but the shadows, their edges blurred by 8 of the drawing's pixels (656×1020). The
// white rect overhangs the drawing so the blur doesn't fade its borders.
const shadowPolygons = shadows
	.map((shape) => `<polygon points="${shape.map((point) => point.join(",")).join(" ")}" fill="black"/>`)
	.join("");
const outsideShadows = [
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><defs>',
	'<filter id="b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.22 0.78"/></filter>',
	'<mask id="m" maskUnits="userSpaceOnUse" x="-50" y="-50" width="200" height="200">',
	`<rect x="-50" y="-50" width="200" height="200" fill="white"/>${shadowPolygons}</mask></defs>`,
	'<g filter="url(#b)"><rect x="-50" y="-50" width="200" height="200" fill="white" mask="url(#m)"/></g></svg>',
].join("");

// The red light from the screen she is staring at, placed by hand in the light editor: soft spots
// (each an ellipse, its centre and radii in percent of the drawing, turned by `angle` degrees), a beam
// between the screen and her face, and a faint red over the whole room. Intensities run from 0 (no
// light, white) to 1 (full red). The red is the artwork's, not a colour role.
type Spot = { x: number; y: number; rx: number; ry: number; angle: number; core: number; mid: number };

const spots: Spot[] = [
	// Her face, turned towards the screen.
	{ x: 64.9, y: 17.6, rx: 42.6, ry: 23.1, angle: 11, core: 0.52, mid: 0.54 },
	// The screen's own spill across the desk and keyboard.
	{ x: 47.9, y: 57.1, rx: 78.9, ry: 25.3, angle: 21, core: 0.91, mid: 0.64 },
	// Her front and the desk's far edge.
	{ x: 76.6, y: 43.4, rx: 48.4, ry: 16, angle: 13, core: 0.57, mid: 0.26 },
];
const beam = { angle: 155, position: 43, width: 18, intensity: 0.68 };
const room = 0.18;

const red = (intensity: number) => {
	const other = Math.round(255 - intensity * 225);
	return `rgb(255 ${other} ${other})`;
};
const percent = (value: number) => `${Math.round(value * 10) / 10}%`;

// Each spot is its own box, so it can turn, and multiplies onto the layer below; outside its ellipse it
// is white, which multiplies to no change.
const spotStyles = spots.map((spot) => ({
	left: percent(spot.x - spot.rx),
	top: percent(spot.y - spot.ry),
	width: percent(2 * spot.rx),
	height: percent(2 * spot.ry),
	transform: `rotate(${spot.angle}deg)`,
	background: `radial-gradient(closest-side, ${red(spot.core)} 0%, ${red(spot.mid)} 45%, #fff 100%)`,
}));

// The layer the spots multiply onto: the beam and the room, multiplied together. It multiplies onto the
// drawing at 45%, masked by the drawing intersected with what lies outside the shadows, so the
// drawing's transparency stays clear and the light stops at the monitor.
const screenLight = {
	maskImage: `url(${drawing}), url("data:image/svg+xml,${encodeURIComponent(outsideShadows)}")`,
	maskSize: "100% 100%",
	maskRepeat: "no-repeat",
	maskComposite: "intersect",
	background: [
		`linear-gradient(${beam.angle}deg, #fff ${percent(beam.position - beam.width)}, ${red(beam.intensity)} ${percent(beam.position)}, #fff ${percent(beam.position + beam.width)})`,
		`linear-gradient(${red(room)}, ${red(room)})`,
	].join(", "),
};

// The crash chart's plane (CrashChart draws it): placed by hand with the chart editor's four-corner
// distort, as the CSS that maps the plane's box onto those corners. Its lengths are in cqw, hundredths
// of the drawing's width, so it holds at any size and needs no script.
const chartPlane = {
	transform:
		"translate(1.6cqw, -63.303cqw) matrix(0.786, -0.088, 0.059, 1.0721, 0, 0) perspective(380.96cqw) rotateX(-16.151deg) rotateY(-31.369deg)",
};
</script>

<template>
	<!-- Pinned to the window's bottom-left corner on every page; the layout paints its content over it.
	     Sized as the drawing would size itself (its own 656px, 34% of the width or 46% of the height,
	     whichever is least), and a container, so the chart can measure itself in the drawing's width. -->
	<div class="@container pointer-events-none select-none fixed bottom-0 left-0 w-[min(656px,34vw,29.584vh)] aspect-[656/1020]">
		<!-- Behind the drawing: the plane starts as a box from above the monitor to past her right, then
		     is distorted into the scene. The moving chart, or for reduced motion a still one. -->
		<div class="absolute left-0 top-[-12%] h-full w-[175%] origin-top-left opacity-70" :style="chartPlane">
			<CrashChart animated class="block motion-reduce:hidden" />
			<CrashChart :animated="false" class="hidden motion-reduce:block" />
		</div>
		<img :src="drawing" alt="" class="relative block h-full w-full" />
		<div class="absolute inset-0 isolate opacity-45 mix-blend-multiply bg-blend-multiply" :style="screenLight">
			<div v-for="(style, index) in spotStyles" :key="index" class="absolute mix-blend-multiply" :style="style" />
		</div>
		<!-- Where the drawing comes from, beside its bottom edge. -->
		<span class="absolute bottom-2 left-full ml-2 whitespace-nowrap text-meta">
			{{ t('corner_drawing_credit') }}
		</span>
	</div>
</template>
