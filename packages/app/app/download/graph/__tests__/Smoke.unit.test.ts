import { EDavkiProvenanceField, ProvenanceGraph, ProvenanceStage } from "@brrr/lib";
import { describe, expect, test } from "vitest";
import { GraphLane } from "~/download/graph/GraphLane";

describe("the app's test runner", () => {
	test("resolves both aliases and lib's build", () => {
		const graph = new ProvenanceGraph({ parent: null });

		expect(graph.nodes()).toHaveLength(0);
		expect(ProvenanceStage.Schema.parse("Test")).toEqual("Test");
		expect(EDavkiProvenanceField.BOUGHT_ON).toEqual("BOUGHT_ON");
		expect(GraphLane.ACQUIRED).toEqual("ACQUIRED");
	});
});
