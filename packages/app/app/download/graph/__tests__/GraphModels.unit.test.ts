import { ProvenanceNodeKind } from "@brrr/lib";
import { describe, expect, test } from "vitest";
import { GraphDirection } from "~/download/graph/GraphDirection";
import { GraphNodeKey, StackKey } from "~/download/graph/GraphIdentifiers";
import { GraphNodeKind, graphNodeKindOf, isHiddenStep } from "~/download/graph/GraphNodeKind";
import { GraphStage, stageOf } from "~/download/graph/GraphStage";

describe("the graph's kinds and stages", () => {
	test("the instrument kinds are context and have no graph kind", () => {
		expect(graphNodeKindOf(ProvenanceNodeKind.GROUPING)).toBeNull();
		expect(graphNodeKindOf(ProvenanceNodeKind.STAGING_GROUPING)).toBeNull();
		expect(graphNodeKindOf(ProvenanceNodeKind.EVENT)).toEqual(GraphNodeKind.EVENT);
	});

	test("record, staging and leg steps are hidden steps", () => {
		expect(isHiddenStep(GraphNodeKind.RECORD)).toEqual(true);
		expect(isHiddenStep(GraphNodeKind.STAGING_EVENT)).toEqual(true);
		expect(isHiddenStep(GraphNodeKind.STAGING_LOT)).toEqual(true);
		expect(isHiddenStep(GraphNodeKind.STAGING_CORPORATE_ACTION)).toEqual(true);
		expect(isHiddenStep(GraphNodeKind.LEG)).toEqual(true);
		expect(isHiddenStep(GraphNodeKind.ROW)).toEqual(false);
		expect(isHiddenStep(GraphNodeKind.PAIR)).toEqual(false);
	});

	test("stages run from the export to what was left out, two apart", () => {
		expect(stageOf(GraphNodeKind.FILE)).toEqual(GraphStage.EXPORT);
		expect(stageOf(GraphNodeKind.EVENT)).toEqual(GraphStage.CORE);
		expect(stageOf(GraphNodeKind.LOT)).toEqual(GraphStage.CORE);
		expect(stageOf(GraphNodeKind.CORPORATE_ACTION)).toEqual(GraphStage.CORE);
		expect(stageOf(GraphNodeKind.MATCHED_LOT)).toEqual(GraphStage.MATCHED);
		expect(stageOf(GraphNodeKind.SUM)).toEqual(GraphStage.MATCHED);
		expect(stageOf(GraphNodeKind.PAIR)).toEqual(GraphStage.REPORT);
		expect(stageOf(GraphNodeKind.REPORT_LINE)).toEqual(GraphStage.REPORT);
		expect(stageOf(GraphNodeKind.DROP)).toEqual(GraphStage.DROP);
	});

	test("a stack key names its owner, direction and kind", () => {
		const owner = GraphNodeKey.Schema.parse("n7");

		expect(StackKey.of(owner, GraphDirection.UP, GraphNodeKind.ROW)).toEqual("n7:UP:ROW");
		expect(StackKey.of(owner, GraphDirection.DOWN, GraphNodeKind.ROW)).toEqual("n7:DOWN:ROW");
	});
});
