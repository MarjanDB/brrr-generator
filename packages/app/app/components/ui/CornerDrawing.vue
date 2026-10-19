<script setup lang="ts">
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

// Red light from the screen she is staring at, which faces her: strongest on her face, a pool by the
// screen, a beam between the two and a faint red over the whole room. White is no light. The layers
// multiply with each other and with the drawing. The mask is the drawing intersected with what lies
// outside the shadows, so its transparency stays clear and the light stops at the monitor. Positions
// are fractions of the drawing, so they hold at any size. The red is the artwork's, not a colour role.
const screenLight = {
	maskImage: `url(${drawing}), url("data:image/svg+xml,${encodeURIComponent(outsideShadows)}")`,
	maskSize: "100% 100%",
	maskRepeat: "no-repeat",
	maskComposite: "intersect",
	background: [
		"radial-gradient(ellipse 30% 18% at 73% 15%, rgb(255 30 30) 0%, rgb(255 60 55) 45%, #fff 100%)",
		"radial-gradient(ellipse 36% 26% at 54% 56%, rgb(255 50 50) 0%, rgb(255 110 105) 45%, #fff 100%)",
		"linear-gradient(140deg, #fff 30%, rgb(255 150 145) 55%, #fff 80%)",
		"linear-gradient(rgb(255 215 210), rgb(255 215 210))",
	].join(", "),
};
</script>

<template>
	<!-- Pinned to the window's bottom-left corner on every page; the layout paints its content over it. -->
	<div class="pointer-events-none select-none fixed bottom-0 left-0">
		<img :src="drawing" alt="" class="block max-h-[46vh] max-w-[34vw]" />
		<div class="absolute inset-0 opacity-45 mix-blend-multiply bg-blend-multiply" :style="screenLight" />
	</div>
</template>
