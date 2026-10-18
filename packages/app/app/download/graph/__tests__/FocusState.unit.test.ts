import { ProvenanceEventKind } from "@brrr/lib";
import { describe, expect, test } from "vitest";
import { FocusState } from "~/download/graph/FocusState";
import type { GraphChain } from "~/types/provenanceGraph";
import { GraphBuilder } from "~/utils/__tests__/support/GraphBuilder";

const emptyChain: GraphChain = { nodes: new Set(), edges: new Set(), sources: new Set() };

describe("the download step's focus state", () => {
	test("a new state has its focus, an empty trail and nothing lit", () => {
		const b = new GraphBuilder();
		const builtFile = b.file({ name: "U1.xml" });
		const file = b.node(builtFile);

		const state = FocusState.start(file);

		expect(state.focus).toBe(file);
		expect(state.trail).toHaveLength(0);
		expect(state.lit).toBeNull();
		expect(state.canGoBack()).toEqual(false);
	});

	test("refocusing twice and going back twice returns to the first focus", () => {
		const b = new GraphBuilder();
		const builtFile = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file: builtFile,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy ACME",
		});
		const file = b.node(builtFile);
		const row = b.node(buy.row);
		const event = b.node(buy.event);

		const state = FocusState.start(file).refocus(row).refocus(event);

		expect(state.focus).toBe(event);
		expect(state.trail).toEqual([file, row]);
		expect(state.canGoBack()).toEqual(true);

		const once = state.back();

		expect(once.focus).toBe(row);
		expect(once.trail).toEqual([file]);

		const twice = once.back();

		expect(twice.focus).toBe(file);
		expect(twice.trail).toHaveLength(0);
		expect(twice.canGoBack()).toEqual(false);
	});

	test("refocusing on the node already in focus does not grow the trail", () => {
		const b = new GraphBuilder();
		const builtFile = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file: builtFile,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy ACME",
		});
		const file = b.node(builtFile);
		const row = b.node(buy.row);

		const state = FocusState.start(file).refocus(row).refocus(row);

		expect(state.focus).toBe(row);
		expect(state.trail).toEqual([file]);
	});

	test("going back with an empty trail leaves the focus where it is", () => {
		const b = new GraphBuilder();
		const builtFile = b.file({ name: "U1.xml" });
		const file = b.node(builtFile);

		const state = FocusState.start(file).back();

		expect(state.focus).toBe(file);
		expect(state.trail).toHaveLength(0);
	});

	test("lighting a chain keeps it until the next refocus", () => {
		const b = new GraphBuilder();
		const builtFile = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file: builtFile,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy ACME",
		});
		const file = b.node(builtFile);
		const row = b.node(buy.row);

		const lit = FocusState.start(file).light(emptyChain);
		const refocused = lit.refocus(row);

		expect(lit.lit).toBe(emptyChain);
		expect(lit.focus).toBe(file);
		expect(refocused.lit).toBeNull();
	});

	test("going back clears what was lit", () => {
		const b = new GraphBuilder();
		const builtFile = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file: builtFile,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy ACME",
		});
		const file = b.node(builtFile);
		const row = b.node(buy.row);

		const state = FocusState.start(file).refocus(row).light(emptyChain).back();

		expect(state.focus).toBe(file);
		expect(state.lit).toBeNull();
	});

	test("clearing the light keeps the focus and the trail", () => {
		const b = new GraphBuilder();
		const builtFile = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file: builtFile,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy ACME",
		});
		const file = b.node(builtFile);
		const row = b.node(buy.row);

		const state = FocusState.start(file).refocus(row).light(emptyChain).clearLight();

		expect(state.focus).toBe(row);
		expect(state.trail).toEqual([file]);
		expect(state.lit).toBeNull();
	});

	test("mapping the focus maps the trail too and clears what was lit", () => {
		const b = new GraphBuilder();
		const builtFile = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file: builtFile,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy ACME",
		});
		const file = b.node(builtFile);
		const row = b.node(buy.row);
		const event = b.node(buy.event);

		const state = FocusState.start(file)
			.refocus(row)
			.light(emptyChain)
			.remap((node) => (node === row ? event : node));

		expect(state.focus).toBe(event);
		expect(state.trail).toEqual([file]);
		expect(state.lit).toBeNull();
	});

	test("no transition changes the state it was called on", () => {
		const b = new GraphBuilder();
		const builtFile = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file: builtFile,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy ACME",
		});
		const file = b.node(builtFile);
		const row = b.node(buy.row);
		const event = b.node(buy.event);
		const state = FocusState.start(file).refocus(row).light(emptyChain);

		state.refocus(event);
		state.back();
		state.light(emptyChain);
		state.clearLight();
		state.remap(() => event);

		expect(state.focus).toBe(row);
		expect(state.trail).toEqual([file]);
		expect(state.lit).toBe(emptyChain);
	});
});
