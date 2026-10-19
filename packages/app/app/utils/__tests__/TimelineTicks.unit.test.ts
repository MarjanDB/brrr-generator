import { describe, expect, test } from "vitest";
import {
	MarkState,
	TickGranularity,
	type TimelineBar,
	TimelineMarkKind,
	TimelineWeight,
} from "~/types/timeline";
import { GraphBuilder } from "~/utils/__tests__/support/GraphBuilder";
import {
	barStateOf,
	markSize,
	markStateOf,
	paddedRange,
	rowPitch,
	timelineTicks,
	timelineYRange,
} from "~/utils/instrumentTimeline";

const day = 24 * 60 * 60 * 1000;

describe("the timeline's axis", () => {
	test("a span of months is ticked on month starts", () => {
		const first = Date.UTC(2024, 0, 10);
		const last = first + 200 * day;

		const ticks = timelineTicks(first, last, 1000);

		expect(ticks[0]?.at).toEqual(Date.UTC(2024, 0, 1));
		expect(ticks[0]?.granularity).toEqual(TickGranularity.MONTH);
		expect(ticks[1]?.at).toEqual(Date.UTC(2024, 1, 1));
		expect(ticks[2]?.at).toEqual(Date.UTC(2024, 2, 1));
	});

	test("a span of ten days is ticked every second day", () => {
		const first = Date.UTC(2024, 0, 10);
		const last = first + 10 * day;

		const ticks = timelineTicks(first, last, 1000);

		expect(ticks[0]?.granularity).toEqual(TickGranularity.DAY);
		expect((ticks[1]?.at ?? 0) - (ticks[0]?.at ?? 0)).toEqual(2 * day);
		expect((ticks[2]?.at ?? 0) - (ticks[1]?.at ?? 0)).toEqual(2 * day);
	});

	test("a span of three days is ticked every day", () => {
		const first = Date.UTC(2024, 0, 10);
		const last = first + 3 * day;

		const ticks = timelineTicks(first, last, 1000);

		expect((ticks[1]?.at ?? 0) - (ticks[0]?.at ?? 0)).toEqual(day);
		expect((ticks[2]?.at ?? 0) - (ticks[1]?.at ?? 0)).toEqual(day);
	});

	test("a span of a month is ticked every week", () => {
		const first = Date.UTC(2024, 0, 10);
		const last = first + 30 * day;

		const ticks = timelineTicks(first, last, 1000);

		expect((ticks[1]?.at ?? 0) - (ticks[0]?.at ?? 0)).toEqual(7 * day);
	});

	test("a holding of three years on a 1000 px axis is ticked every quarter", () => {
		const first = Date.UTC(2021, 2, 15);
		const last = Date.UTC(2024, 2, 18);

		const ticks = timelineTicks(first, last, 1000);

		expect(ticks[0]?.at).toEqual(Date.UTC(2021, 3, 1));
		expect(ticks[0]?.granularity).toEqual(TickGranularity.MONTH);
		expect(ticks[1]?.at).toEqual(Date.UTC(2021, 6, 1));
		expect(ticks[2]?.at).toEqual(Date.UTC(2021, 9, 1));
		expect(ticks).toHaveLength(13);
	});

	test("a holding of three years on a 300 px axis is ticked every year", () => {
		const first = Date.UTC(2021, 2, 15);
		const last = Date.UTC(2024, 2, 18);

		const ticks = timelineTicks(first, last, 300);

		expect(ticks[0]?.at).toEqual(Date.UTC(2022, 0, 1));
		expect(ticks[0]?.granularity).toEqual(TickGranularity.YEAR);
		expect(ticks[1]?.at).toEqual(Date.UTC(2023, 0, 1));
		expect(ticks[2]?.at).toEqual(Date.UTC(2024, 0, 1));
		expect(ticks).toHaveLength(3);
	});

	test("a span of a month on a 300 px axis is ticked every two weeks", () => {
		const first = Date.UTC(2024, 0, 10);
		const last = first + 30 * day;

		const ticks = timelineTicks(first, last, 300);

		expect(ticks[0]?.granularity).toEqual(TickGranularity.DAY);
		expect((ticks[1]?.at ?? 0) - (ticks[0]?.at ?? 0)).toEqual(14 * day);
	});

	test("a single day still has ticks, all inside the padded range", () => {
		const only = Date.UTC(2024, 0, 10);

		const ticks = timelineTicks(only, only, 1000);
		const range = paddedRange(only, only);

		expect(ticks.length).toBeGreaterThan(0);
		expect(ticks[0]?.at).toBeGreaterThanOrEqual(range.min);
		expect(ticks[ticks.length - 1]?.at).toBeLessThanOrEqual(range.max);
	});

	test("a single day is padded two days each side", () => {
		const only = Date.UTC(2024, 0, 10);

		const range = paddedRange(only, only);

		expect(range.min).toEqual(only - 2 * day);
		expect(range.max).toEqual(only + 2 * day);
	});

	test("a long span is padded by six percent of it", () => {
		const first = Date.UTC(2024, 0, 1);
		const last = first + 200 * day;

		const range = paddedRange(first, last);

		expect(range.min).toEqual(first - 12 * day);
		expect(range.max).toEqual(last + 12 * day);
	});
});

describe("the timeline's rows", () => {
	test("up to twelve bars sit 34 px apart", () => {
		expect(rowPitch(3)).toEqual(34);
		expect(rowPitch(12)).toEqual(34);
	});

	test("more bars share 408 px, never closer than 12 px", () => {
		expect(rowPitch(24)).toEqual(17);
		expect(rowPitch(100)).toEqual(12);
	});

	test("every bar, triangle and point is 12 px, whatever its quantity or weight", () => {
		expect(markSize(rowPitch(3))).toEqual(12);
		expect(markSize(rowPitch(24))).toEqual(12);
	});

	test("rows closer than 16 px shrink every mark to leave 4 px between rows", () => {
		expect(markSize(rowPitch(100))).toEqual(8);
	});

	test("the bars sit above the points' row, with room around both", () => {
		const range = timelineYRange(2, 1);

		expect(range.min).toEqual(-0.9);
		expect(range.max).toEqual(2.7);
	});

	test("without points the scale ends a row under the lowest bar, where the tax year's label goes", () => {
		const range = timelineYRange(2, 0);

		expect(range.min).toEqual(0);
		expect(range.max).toEqual(2.7);
	});

	test("without bars the scale holds the points' row and its stacks", () => {
		const range = timelineYRange(0, 2);

		expect(range.min).toEqual(-1.9);
		expect(range.max).toEqual(0.9);
	});
});

describe("the state of a mark", () => {
	test("the focused node is focused, even when it is lit", () => {
		const b = new GraphBuilder();
		const focus = b.node(b.file({ name: "U1.xml" }));

		expect(markStateOf(focus, focus, new Set([focus]))).toEqual(MarkState.FOCUSED);
	});

	test("a lit node is lit", () => {
		const b = new GraphBuilder();
		const focus = b.node(b.file({ name: "U1.xml" }));
		const other = b.node(b.file({ name: "U2.xml" }));

		expect(markStateOf(other, focus, new Set([other]))).toEqual(MarkState.LIT);
	});

	test("a node outside a chain that is lit is dimmed", () => {
		const b = new GraphBuilder();
		const focus = b.node(b.file({ name: "U1.xml" }));
		const lit = b.node(b.file({ name: "U2.xml" }));
		const other = b.node(b.file({ name: "U3.xml" }));

		expect(markStateOf(other, focus, new Set([lit]))).toEqual(MarkState.DIMMED);
	});

	test("with nothing lit every other node is normal", () => {
		const b = new GraphBuilder();
		const focus = b.node(b.file({ name: "U1.xml" }));
		const other = b.node(b.file({ name: "U2.xml" }));

		expect(markStateOf(other, focus, null)).toEqual(MarkState.NORMAL);
	});
});

describe("the state of a lot's bar", () => {
	test("a bar whose lot is the focus is focused", () => {
		const b = new GraphBuilder();
		const lot = b.node(b.file({ name: "lot" }));
		const buy = b.node(b.file({ name: "buy" }));
		const sale = b.node(b.file({ name: "sale" }));
		const bar: TimelineBar = {
			lot,
			opened: { node: buy, kind: TimelineMarkKind.BOUGHT, at: 0, weight: TimelineWeight.REPORTED },
			closed: { node: sale, kind: TimelineMarkKind.SOLD, at: 1, weight: TimelineWeight.REPORTED },
			quantity: 10,
			weight: TimelineWeight.REPORTED,
		};

		expect(barStateOf(bar, lot, null)).toEqual(MarkState.FOCUSED);
	});

	test("a bar the focused trade opened or closed is lit, even with nothing else lit", () => {
		const b = new GraphBuilder();
		const lot = b.node(b.file({ name: "lot" }));
		const buy = b.node(b.file({ name: "buy" }));
		const sale = b.node(b.file({ name: "sale" }));
		const bar: TimelineBar = {
			lot,
			opened: { node: buy, kind: TimelineMarkKind.BOUGHT, at: 0, weight: TimelineWeight.REPORTED },
			closed: { node: sale, kind: TimelineMarkKind.SOLD, at: 1, weight: TimelineWeight.REPORTED },
			quantity: 10,
			weight: TimelineWeight.REPORTED,
		};

		expect(barStateOf(bar, sale, null)).toEqual(MarkState.LIT);
	});

	test("a bar whose lot is outside a lit chain is dimmed", () => {
		const b = new GraphBuilder();
		const lot = b.node(b.file({ name: "lot" }));
		const buy = b.node(b.file({ name: "buy" }));
		const sale = b.node(b.file({ name: "sale" }));
		const other = b.node(b.file({ name: "other" }));
		const bar: TimelineBar = {
			lot,
			opened: { node: buy, kind: TimelineMarkKind.BOUGHT, at: 0, weight: TimelineWeight.REPORTED },
			closed: { node: sale, kind: TimelineMarkKind.SOLD, at: 1, weight: TimelineWeight.REPORTED },
			quantity: 10,
			weight: TimelineWeight.REPORTED,
		};

		expect(barStateOf(bar, other, new Set([other]))).toEqual(MarkState.DIMMED);
	});

	test("what is still open takes the state of the trade that opened it", () => {
		const b = new GraphBuilder();
		const buy = b.node(b.file({ name: "buy" }));
		const bar: TimelineBar = {
			lot: null,
			opened: { node: buy, kind: TimelineMarkKind.BOUGHT, at: 0, weight: TimelineWeight.CONTEXT },
			closed: null,
			quantity: 3,
			weight: TimelineWeight.CONTEXT,
		};

		expect(barStateOf(bar, buy, null)).toEqual(MarkState.FOCUSED);
	});
});
