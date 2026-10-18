import { describe, expect, test } from "vitest";
import { GraphBuilder } from "~/download/graph/__tests__/support/GraphBuilder";
import { MarkState, TickGranularity } from "~/types/timeline";
import { markStateOf, paddedRange, timelineTicks } from "~/utils/instrumentTimeline";

const day = 24 * 60 * 60 * 1000;

describe("the timeline's axis", () => {
	test("a span of months is ticked on month starts", () => {
		const first = Date.UTC(2024, 0, 10);
		const last = first + 200 * day;

		const ticks = timelineTicks(first, last);

		expect(ticks[0]?.at).toEqual(Date.UTC(2024, 0, 1));
		expect(ticks[0]?.granularity).toEqual(TickGranularity.MONTH);
		expect(ticks[1]?.at).toEqual(Date.UTC(2024, 1, 1));
		expect(ticks[2]?.at).toEqual(Date.UTC(2024, 2, 1));
	});

	test("a span of ten days is ticked every second day", () => {
		const first = Date.UTC(2024, 0, 10);
		const last = first + 10 * day;

		const ticks = timelineTicks(first, last);

		expect(ticks[0]?.granularity).toEqual(TickGranularity.DAY);
		expect((ticks[1]?.at ?? 0) - (ticks[0]?.at ?? 0)).toEqual(2 * day);
		expect((ticks[2]?.at ?? 0) - (ticks[1]?.at ?? 0)).toEqual(2 * day);
	});

	test("a span of three days is ticked every day", () => {
		const first = Date.UTC(2024, 0, 10);
		const last = first + 3 * day;

		const ticks = timelineTicks(first, last);

		expect((ticks[1]?.at ?? 0) - (ticks[0]?.at ?? 0)).toEqual(day);
		expect((ticks[2]?.at ?? 0) - (ticks[1]?.at ?? 0)).toEqual(day);
	});

	test("a span of a month is ticked every week", () => {
		const first = Date.UTC(2024, 0, 10);
		const last = first + 30 * day;

		const ticks = timelineTicks(first, last);

		expect((ticks[1]?.at ?? 0) - (ticks[0]?.at ?? 0)).toEqual(7 * day);
	});

	test("a single day still has ticks, all inside the padded range", () => {
		const only = Date.UTC(2024, 0, 10);

		const ticks = timelineTicks(only, only);
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
