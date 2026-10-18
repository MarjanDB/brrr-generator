import { TimelineMarkKind } from "~/download/timeline/TimelineMarkKind";

// The i18n key of the tooltip text of each kind of mark.
export const markKeys: Record<TimelineMarkKind, string> = {
	[TimelineMarkKind.BROKER_LOT]: "download_mark_broker_lot",
	[TimelineMarkKind.BOUGHT]: "download_mark_bought",
	[TimelineMarkKind.CORPORATE_ACTION]: "download_mark_corporate_action",
	[TimelineMarkKind.DIVIDEND]: "download_mark_dividend",
	[TimelineMarkKind.SOLD]: "download_mark_sold",
	[TimelineMarkKind.TAX]: "download_mark_tax",
};
