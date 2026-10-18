import { type ProvenanceDrop, ProvenanceEventKind, ProvenanceField } from "@brrr/lib";
import { CaptionSegment } from "~/download/graph/CaptionSegment";
import { CaptionSegmentKind } from "~/download/graph/CaptionSegmentKind";
import type { GraphLayout } from "~/download/graph/GraphLayout";
import type { GraphLayoutNode } from "~/download/graph/GraphLayoutNode";
import { GraphNodeKind } from "~/download/graph/GraphNodeKind";

// What the graph shows, as the parts of one line: the focus, then what it became. The view writes
// the sentence. Only the main path counts: the faded stubs are not part of what is shown.
export function captionOf(layout: GraphLayout): CaptionSegment[] {
	const focus = layout.focus;
	const segments = [segment({ kind: CaptionSegmentKind.FOCUS, node: focus })];
	const onPath = layout.nodes.filter((node) => !node.isStub);
	switch (focus.node.kind) {
		case GraphNodeKind.EVENT:
			return [...segments, ...eventSegments(layout, onPath)];
		case GraphNodeKind.PAIR:
			return [...segments, segment({ kind: CaptionSegmentKind.BOUGHT_AND_SOLD, node: focus })];
		case GraphNodeKind.LOT: {
			const leftOut = layout.edges.find(
				(edge) => !edge.isStub && edge.from === focus && edge.to.node.kind === GraphNodeKind.DROP,
			);
			return leftOut === undefined
				? segments
				: [
						...segments,
						segment({
							kind: CaptionSegmentKind.LEFT_OUT,
							node: leftOut.to,
							drop: leftOut.to.node.drop,
						}),
					];
		}
		case GraphNodeKind.CORPORATE_ACTION: {
			// Trades only: a split also rescales broker lots, and a rename adjusts no trade at all
			// (it only regroups), so it says nothing after its own name.
			const trades = onPath.filter((node) => node.node.kind === GraphNodeKind.EVENT).length;
			return trades === 0
				? segments
				: [...segments, segment({ kind: CaptionSegmentKind.ADJUSTED, count: trades })];
		}
		default:
			return segments;
	}
}

function eventSegments(layout: GraphLayout, onPath: GraphLayoutNode[]): CaptionSegment[] {
	const segments: CaptionSegment[] = [];
	const rebuilt = layout.edges.find(
		(edge) => !edge.isStub && edge.from === layout.focus && edge.split !== null,
	);
	if (rebuilt !== undefined) {
		segments.push(segment({ kind: CaptionSegmentKind.SPLIT_INTO, node: rebuilt.to }));
	}
	const pairs = onPath.filter((node) => node.node.kind === GraphNodeKind.PAIR);
	const lines = onPath.filter((node) => node.node.kind === GraphNodeKind.REPORT_LINE);
	const [firstPair] = pairs;
	if (firstPair !== undefined) {
		const sold =
			layout.focus.node.source?.fields[ProvenanceField.EVENT_KIND] === ProvenanceEventKind.SOLD;
		segments.push(
			segment({
				kind: CaptionSegmentKind.MATCHED_WITH,
				node: firstPair,
				count: pairs.length,
				opposite: sold ? ProvenanceEventKind.ACQUIRED : ProvenanceEventKind.SOLD,
			}),
			segment({
				kind: CaptionSegmentKind.REPORT_LINES,
				count: pairs.reduce(
					(sum, pair) =>
						sum +
						Number(pair.node.pair?.acquired.line !== null) +
						Number(pair.node.pair?.sold.line !== null),
					0,
				),
			}),
		);
	} else if (lines[0] !== undefined) {
		segments.push(
			segment({ kind: CaptionSegmentKind.SUMMED_INTO, node: lines[0], count: lines.length }),
		);
	}
	return segments;
}

type SegmentParts = {
	kind: CaptionSegmentKind;
	node?: GraphLayoutNode;
	count?: number;
	opposite?: ProvenanceEventKind;
	drop?: ProvenanceDrop | null;
};

function segment(parts: SegmentParts): CaptionSegment {
	return new CaptionSegment({
		kind: parts.kind,
		node: parts.node ?? null,
		count: parts.count ?? null,
		opposite: parts.opposite ?? null,
		drop: parts.drop ?? null,
	});
}
