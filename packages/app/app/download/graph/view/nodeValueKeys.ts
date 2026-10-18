import { GraphNodeKind } from "~/download/graph/GraphNodeKind";
import { NodeValueKind } from "~/download/graph/view/NodeValueKind";

// The i18n key of the text each kind of node value is written with.
export const nodeValueKeys: Record<NodeValueKind, string> = {
	[NodeValueKind.TEXT]: "download_node_text",
	[NodeValueKind.TRADE]: "download_node_trade",
	[NodeValueKind.CASH]: "download_node_cash",
	[NodeValueKind.LOT]: "download_node_lot",
	[NodeValueKind.SPLIT]: "download_node_split",
	[NodeValueKind.REVERSE_SPLIT]: "download_node_reverse_split",
	[NodeValueKind.RENAME]: "download_node_rename",
	[NodeValueKind.MATCHED]: "download_node_matched",
	[NodeValueKind.SUM]: "download_node_sum",
	[NodeValueKind.LINE_BOUGHT]: "download_node_line_bought",
	[NodeValueKind.LINE_SOLD]: "download_node_line_sold",
	[NodeValueKind.LINE_DIVIDEND]: "download_node_line_dividend",
	[NodeValueKind.LINE_OTHER]: "download_node_line_other",
	[NodeValueKind.STACK]: "download_node_stack",
};

// The noun for each kind of node, as in "6 × rows".
export const stackKindKeys: Record<GraphNodeKind, string> = {
	[GraphNodeKind.FILE]: "download_kind_file",
	[GraphNodeKind.ROW]: "download_kind_row",
	[GraphNodeKind.RECORD]: "download_kind_record",
	[GraphNodeKind.STAGING_EVENT]: "download_kind_staging_event",
	[GraphNodeKind.STAGING_LOT]: "download_kind_staging_lot",
	[GraphNodeKind.STAGING_CORPORATE_ACTION]: "download_kind_staging_corporate_action",
	[GraphNodeKind.EVENT]: "download_kind_event",
	[GraphNodeKind.LOT]: "download_kind_lot",
	[GraphNodeKind.CORPORATE_ACTION]: "download_kind_corporate_action",
	[GraphNodeKind.MATCHED_LOT]: "download_kind_matched_lot",
	[GraphNodeKind.SUM]: "download_kind_sum",
	[GraphNodeKind.LEG]: "download_kind_leg",
	[GraphNodeKind.REPORT_LINE]: "download_kind_report_line",
	[GraphNodeKind.PAIR]: "download_kind_pair",
	[GraphNodeKind.DROP]: "download_kind_drop",
	[GraphNodeKind.STACK]: "download_kind_stack",
};
