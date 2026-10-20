import { ProvenanceNodeKind } from "@brrr/lib";
import { describe, expect, test } from "vitest";
import { GraphModels } from "~/composables/provenanceGraph/graphModels";
import {
	GraphDirection,
	GraphNodeKey,
	GraphNodeKind,
	GraphStage,
	StackKey,
} from "~/types/provenanceGraph";

describe("the graph's kinds and stages", () => {
	test("the instrument kinds are context and have no graph kind", () => {
		expect(GraphModels.nodeKindOf(ProvenanceNodeKind.GROUPING)).toBeNull();
		expect(GraphModels.nodeKindOf(ProvenanceNodeKind.STAGING_GROUPING)).toBeNull();
		expect(GraphModels.nodeKindOf(ProvenanceNodeKind.EVENT)).toEqual(GraphNodeKind.EVENT);
	});

	test("record, staging and leg steps are hidden steps", () => {
		expect(GraphModels.isHiddenStep(GraphNodeKind.RECORD)).toEqual(true);
		expect(GraphModels.isHiddenStep(GraphNodeKind.STAGING_EVENT)).toEqual(true);
		expect(GraphModels.isHiddenStep(GraphNodeKind.STAGING_LOT)).toEqual(true);
		expect(GraphModels.isHiddenStep(GraphNodeKind.STAGING_CORPORATE_ACTION)).toEqual(true);
		expect(GraphModels.isHiddenStep(GraphNodeKind.LEG)).toEqual(true);
		expect(GraphModels.isHiddenStep(GraphNodeKind.ROW)).toEqual(false);
		expect(GraphModels.isHiddenStep(GraphNodeKind.PAIR)).toEqual(false);
	});

	test("stages run from the export to what was left out, two apart", () => {
		expect(GraphModels.stageOf(GraphNodeKind.FILE)).toEqual(GraphStage.EXPORT);
		expect(GraphModels.stageOf(GraphNodeKind.EVENT)).toEqual(GraphStage.CORE);
		expect(GraphModels.stageOf(GraphNodeKind.LOT)).toEqual(GraphStage.CORE);
		expect(GraphModels.stageOf(GraphNodeKind.CORPORATE_ACTION)).toEqual(GraphStage.CORE);
		expect(GraphModels.stageOf(GraphNodeKind.MATCHED_LOT)).toEqual(GraphStage.MATCHED);
		expect(GraphModels.stageOf(GraphNodeKind.SUM)).toEqual(GraphStage.MATCHED);
		expect(GraphModels.stageOf(GraphNodeKind.PAIR)).toEqual(GraphStage.REPORT);
		expect(GraphModels.stageOf(GraphNodeKind.REPORT_LINE)).toEqual(GraphStage.REPORT);
		expect(GraphModels.stageOf(GraphNodeKind.DROP)).toEqual(GraphStage.DROP);
	});

	test("a stack key names its owner, direction and kind", () => {
		const owner = GraphNodeKey.Schema.parse("n7");

		expect(StackKey.of(owner, GraphDirection.UP, GraphNodeKind.ROW)).toEqual("n7:UP:ROW");
		expect(StackKey.of(owner, GraphDirection.DOWN, GraphNodeKind.ROW)).toEqual("n7:DOWN:ROW");
	});
});
