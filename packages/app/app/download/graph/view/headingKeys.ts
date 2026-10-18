import { ReportInstrumentKind } from "@brrr/lib";
import { GraphHeading } from "~/download/graph/GraphHeading";

// The i18n key of each name a column can carry.
export const headingKeys: Record<GraphHeading, string> = {
	[GraphHeading.EXPORT]: "download_heading_export",
	[GraphHeading.ROW]: "download_heading_row",
	[GraphHeading.PARSED]: "download_heading_parsed",
	[GraphHeading.STAGING]: "download_heading_staging",
	[GraphHeading.TRADE]: "download_heading_trade",
	[GraphHeading.DIVIDEND]: "download_heading_dividend",
	[GraphHeading.TAX]: "download_heading_tax",
	[GraphHeading.BROKER_LOT]: "download_heading_broker_lot",
	[GraphHeading.CORPORATE_ACTION]: "download_heading_corporate_action",
	[GraphHeading.AFTER_CORPORATE_ACTION]: "download_heading_after_corporate_action",
	[GraphHeading.MATCHED]: "download_heading_matched",
	[GraphHeading.SUMMED_PER_ACTION]: "download_heading_summed_per_action",
	[GraphHeading.SUMMED_PER_DAY]: "download_heading_summed_per_day",
	[GraphHeading.LEG]: "download_heading_leg",
	[GraphHeading.REPORT]: "download_heading_report",
	[GraphHeading.REPORT_PAIRS]: "download_heading_report_pairs",
	[GraphHeading.LEFT_OUT]: "download_heading_left_out",
};

export type LaneLabelKeys = {
	acquired: string;
	sold: string;
};

// The names of the two bands: buys and sells for trades, paid and withheld for dividends.
export function laneLabelKeys(kind: ReportInstrumentKind): LaneLabelKeys {
	switch (kind) {
		case ReportInstrumentKind.SHARE:
		case ReportInstrumentKind.OPTION_CONTRACT:
			return { acquired: "download_lane_buys", sold: "download_lane_sells" };
		case ReportInstrumentKind.DIVIDEND_PAYER:
			return { acquired: "download_lane_paid", sold: "download_lane_withheld" };
	}
}
