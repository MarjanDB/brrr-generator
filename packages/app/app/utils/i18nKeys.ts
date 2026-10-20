import {
	DropCategory,
	DropReason,
	EDavkiProvenanceField,
	IdentifierChangeType,
	ProvenanceDetailKind,
	ProvenanceDetailValue,
	ProvenanceEventKind,
	ProvenanceLegSide,
	ReportInstrumentKind,
	TaxAuthorityLotMatchingMethod,
} from "@brrr/lib";
import { CountNoun, PluralForm } from "~/types/counts";
import { DetectedReason } from "~/types/instrumentCard";
import { GraphHeading, GraphNodeKind, NodeValueKind } from "~/types/provenanceGraph";
import { ReportStep } from "~/types/reportFlow";
import { TimelineMarkKind } from "~/types/timeline";

// The i18n key of each enum value the download step writes out. Record<Enum, string> makes a new
// value fail to compile until it has a key.
const dropReasonKeys: Record<DropReason, string> = {
	[DropReason.NOT_RECOGNISED]: "download_drop_not_recognised",
	[DropReason.UNREADABLE]: "download_drop_unreadable",
	[DropReason.NOT_SUPPORTED]: "download_drop_not_supported",
	[DropReason.UNPAIRED]: "download_drop_unpaired",
	[DropReason.UNKNOWN_TYPE]: "download_drop_unknown_type",
	[DropReason.NO_TRADES]: "download_drop_no_trades",
	[DropReason.NOT_USED]: "download_drop_not_used",
	[DropReason.OUTSIDE_PERIOD]: "download_drop_outside_period",
	[DropReason.POSITION_OPEN]: "download_drop_position_open",
};

const detailKindKeys: Record<ProvenanceDetailKind, string> = {
	[ProvenanceDetailKind.FILE_ERROR]: "download_detail_file_error",
	[ProvenanceDetailKind.ASSET_CLASS_NOT_SUPPORTED]: "download_detail_asset_class_not_supported",
	[ProvenanceDetailKind.CLOSED_OUTSIDE_PERIOD]: "download_detail_closed_outside_period",
	[ProvenanceDetailKind.PAID_OUTSIDE_PERIOD]: "download_detail_paid_outside_period",
	[ProvenanceDetailKind.LOT_MATCHING_IGNORES_BROKER_LOTS]:
		"download_detail_lot_matching_ignores_broker_lots",
	[ProvenanceDetailKind.FORM_IGNORES_BROKER_LOTS]: "download_detail_form_ignores_broker_lots",
	[ProvenanceDetailKind.COMPANY_NOT_FOUND]: "download_detail_company_not_found",
	[ProvenanceDetailKind.COMPANY_LOOKUP_FAILED]: "download_detail_company_lookup_failed",
};

// The heading of a group of the report's problems of one kind, in the problems view's list.
const warningGroupKeys: Record<ProvenanceDetailKind, string> = {
	[ProvenanceDetailKind.FILE_ERROR]: "download_warning_group_file_error",
	[ProvenanceDetailKind.ASSET_CLASS_NOT_SUPPORTED]:
		"download_warning_group_asset_class_not_supported",
	[ProvenanceDetailKind.CLOSED_OUTSIDE_PERIOD]: "download_warning_group_closed_outside_period",
	[ProvenanceDetailKind.PAID_OUTSIDE_PERIOD]: "download_warning_group_paid_outside_period",
	[ProvenanceDetailKind.LOT_MATCHING_IGNORES_BROKER_LOTS]:
		"download_warning_group_lot_matching_ignores_broker_lots",
	[ProvenanceDetailKind.FORM_IGNORES_BROKER_LOTS]:
		"download_warning_group_form_ignores_broker_lots",
	[ProvenanceDetailKind.COMPANY_NOT_FOUND]: "download_warning_group_company_not_found",
	[ProvenanceDetailKind.COMPANY_LOOKUP_FAILED]: "download_warning_group_company_lookup_failed",
};

// The name each value of a detail has in its sentence's text: {error}, {assetClass}, {date}, ...
const detailValueParams: Record<ProvenanceDetailValue, string> = {
	[ProvenanceDetailValue.ERROR]: "error",
	[ProvenanceDetailValue.ASSET_CLASS]: "assetClass",
	[ProvenanceDetailValue.DATE]: "date",
	[ProvenanceDetailValue.LOT_MATCHING_METHOD]: "method",
	[ProvenanceDetailValue.ISIN]: "isin",
};

const dropCategoryKeys: Record<DropCategory, string> = {
	[DropCategory.NOT_IN_THIS_REPORT]: "download_category_not_in_report",
	[DropCategory.NEEDS_A_LOOK]: "download_category_needs_look",
};

const eventKindKeys: Record<ProvenanceEventKind, string> = {
	[ProvenanceEventKind.ACQUIRED]: "download_fact_kind_acquired",
	[ProvenanceEventKind.SOLD]: "download_fact_kind_sold",
	[ProvenanceEventKind.DIVIDEND]: "download_fact_kind_dividend",
	[ProvenanceEventKind.PAYMENT_IN_LIEU]: "download_fact_kind_payment_in_lieu",
	[ProvenanceEventKind.WITHHOLDING_TAX]: "download_fact_kind_withholding_tax",
	[ProvenanceEventKind.WITHHOLDING_TAX_ON_PAYMENT_IN_LIEU]:
		"download_fact_kind_withholding_tax_on_payment_in_lieu",
};

const lotMatchingKeys: Record<TaxAuthorityLotMatchingMethod, string> = {
	[TaxAuthorityLotMatchingMethod.NONE]: "download_lot_matching_none",
	[TaxAuthorityLotMatchingMethod.FIFO]: "download_lot_matching_fifo",
	[TaxAuthorityLotMatchingMethod.PROVIDED]: "download_lot_matching_provided",
};

// The tooltip text of each kind of mark on the timeline.
const markKeys: Record<TimelineMarkKind, string> = {
	[TimelineMarkKind.BROKER_LOT]: "download_mark_broker_lot",
	[TimelineMarkKind.BOUGHT]: "download_mark_bought",
	[TimelineMarkKind.CORPORATE_ACTION]: "download_mark_corporate_action",
	[TimelineMarkKind.DIVIDEND]: "download_mark_dividend",
	[TimelineMarkKind.SOLD]: "download_mark_sold",
	[TimelineMarkKind.TAX]: "download_mark_tax",
};

// What a corporate action's chip says, by the kind of change.
const chipKindKeys: Record<IdentifierChangeType, string> = {
	[IdentifierChangeType.SPLIT]: "download_chip_split",
	[IdentifierChangeType.REVERSE_SPLIT]: "download_chip_reverse_split",
	[IdentifierChangeType.RENAME]: "download_chip_rename",
};

// The verdict on the badge of each reason in "Everything detected".
const detectedVerdictKeys: Record<DetectedReason, string> = {
	[DetectedReason.REPORTED]: "download_verdict_reported",
	[DetectedReason.CLOSED_BEFORE_YEAR]: "download_verdict_excluded",
	[DetectedReason.CLOSED_AFTER_YEAR]: "download_verdict_excluded",
	[DetectedReason.STILL_OPEN]: "download_verdict_excluded",
	[DetectedReason.PAID_OUTSIDE_YEAR]: "download_verdict_excluded",
	[DetectedReason.LEFT_OUT]: "download_verdict_excluded",
	[DetectedReason.APPLIED]: "download_verdict_applied",
	[DetectedReason.NO_EFFECT]: "download_verdict_no_effect",
};

// The detail after the verdict, when the reason covers the whole item ({form}, {year}, {years}).
// A reason the report gave itself says the report's sentence instead, when it has one.
const detectedDetailKeys: Record<DetectedReason, string> = {
	[DetectedReason.REPORTED]: "download_reason_reported",
	[DetectedReason.CLOSED_BEFORE_YEAR]: "download_reason_closed_before",
	[DetectedReason.CLOSED_AFTER_YEAR]: "download_reason_closed_after",
	[DetectedReason.STILL_OPEN]: "download_reason_still_open",
	[DetectedReason.PAID_OUTSIDE_YEAR]: "download_reason_paid_outside",
	[DetectedReason.LEFT_OUT]: "download_reason_left_out",
	[DetectedReason.APPLIED]: "download_reason_applied",
	[DetectedReason.NO_EFFECT]: "download_reason_no_effect",
};

// The detail when a trade is split between reasons, which says how much of it each covers
// ({quantity}). Only a trade is split, so the other reasons keep their whole detail.
const detectedPartKeys: Record<DetectedReason, string> = {
	[DetectedReason.REPORTED]: "download_reason_reported_part",
	[DetectedReason.CLOSED_BEFORE_YEAR]: "download_reason_closed_before_part",
	[DetectedReason.CLOSED_AFTER_YEAR]: "download_reason_closed_after_part",
	[DetectedReason.STILL_OPEN]: "download_reason_still_open_part",
	[DetectedReason.PAID_OUTSIDE_YEAR]: "download_reason_paid_outside",
	[DetectedReason.LEFT_OUT]: "download_reason_left_out",
	[DetectedReason.APPLIED]: "download_reason_applied",
	[DetectedReason.NO_EFFECT]: "download_reason_no_effect",
};

// A count with what it counts, in each plural form ({count}).
const countKeys: Record<CountNoun, Record<PluralForm, string>> = {
	[CountNoun.SHARE]: {
		[PluralForm.ONE]: "download_unit_share_one",
		[PluralForm.TWO]: "download_unit_share_two",
		[PluralForm.FEW]: "download_unit_share_few",
		[PluralForm.OTHER]: "download_unit_share_other",
	},
	[CountNoun.CONTRACT]: {
		[PluralForm.ONE]: "download_unit_contract_one",
		[PluralForm.TWO]: "download_unit_contract_two",
		[PluralForm.FEW]: "download_unit_contract_few",
		[PluralForm.OTHER]: "download_unit_contract_other",
	},
	[CountNoun.FORM_LINE]: {
		[PluralForm.ONE]: "count_form_line_one",
		[PluralForm.TWO]: "count_form_line_two",
		[PluralForm.FEW]: "count_form_line_few",
		[PluralForm.OTHER]: "count_form_line_other",
	},
	[CountNoun.ITEM_NOT_ON_FORM]: {
		[PluralForm.ONE]: "count_item_not_on_form_one",
		[PluralForm.TWO]: "count_item_not_on_form_two",
		[PluralForm.FEW]: "count_item_not_on_form_few",
		[PluralForm.OTHER]: "count_item_not_on_form_other",
	},
	[CountNoun.ITEM_NEEDS_A_LOOK]: {
		[PluralForm.ONE]: "count_item_needs_a_look_one",
		[PluralForm.TWO]: "count_item_needs_a_look_two",
		[PluralForm.FEW]: "count_item_needs_a_look_few",
		[PluralForm.OTHER]: "count_item_needs_a_look_other",
	},
	[CountNoun.WARNING]: {
		[PluralForm.ONE]: "count_warning_one",
		[PluralForm.TWO]: "count_warning_two",
		[PluralForm.FEW]: "count_warning_few",
		[PluralForm.OTHER]: "count_warning_other",
	},
	[CountNoun.ITEM_LEFT_OUT]: {
		[PluralForm.ONE]: "count_item_left_out_one",
		[PluralForm.TWO]: "count_item_left_out_two",
		[PluralForm.FEW]: "count_item_left_out_few",
		[PluralForm.OTHER]: "count_item_left_out_other",
	},
};

// The text each kind of node value is written with.
const nodeValueKeys: Record<NodeValueKind, string> = {
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
	[NodeValueKind.STEP]: "download_node_step",
	[NodeValueKind.LEG]: "download_node_leg",
};

// The side of a matched lot a leg is.
const legSideKeys: Record<ProvenanceLegSide, string> = {
	[ProvenanceLegSide.ACQUIRED]: "download_leg_acquired",
	[ProvenanceLegSide.SOLD]: "download_leg_sold",
};

// The noun for each kind of node, as in "6 × rows".
const stackKindKeys: Record<GraphNodeKind, string> = {
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

// The name each column can carry.
const headingKeys: Record<GraphHeading, string> = {
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
	[GraphHeading.OTHER_SIDE]: "download_heading_other_side",
};

type LaneLabelKeys = {
	acquired: string;
	sold: string;
};

// The names of the two bands: buys and sells for trades, paid and withheld for dividends.
function laneLabelKeys(kind: ReportInstrumentKind): LaneLabelKeys {
	switch (kind) {
		case ReportInstrumentKind.STOCK:
		case ReportInstrumentKind.OPTION_CONTRACT:
			return { acquired: "download_lane_buys", sold: "download_lane_sells" };
		case ReportInstrumentKind.DIVIDEND_PAYER:
			return { acquired: "download_lane_paid", sold: "download_lane_withheld" };
	}
}

// The name of each field a report line carries, as the form names it.
const edavkiFieldKeys: Record<EDavkiProvenanceField, string> = {
	[EDavkiProvenanceField.BOUGHT_ON]: "download_edavki_field_bought_on",
	[EDavkiProvenanceField.SOLD_ON]: "download_edavki_field_sold_on",
	[EDavkiProvenanceField.GAIN_TYPE]: "download_edavki_field_gain_type",
	[EDavkiProvenanceField.QUANTITY]: "download_edavki_field_quantity",
	[EDavkiProvenanceField.PRICE_PER_UNIT]: "download_edavki_field_price_per_unit",
	[EDavkiProvenanceField.TOTAL_PRICE]: "download_edavki_field_total_price",
	[EDavkiProvenanceField.COMMISSIONS]: "download_edavki_field_commissions",
	[EDavkiProvenanceField.DATE_RECEIVED]: "download_edavki_field_date_received",
	[EDavkiProvenanceField.PAYER_ID]: "download_edavki_field_payer_id",
	[EDavkiProvenanceField.DIVIDEND_TYPE]: "download_edavki_field_dividend_type",
	[EDavkiProvenanceField.TRACKING_ID]: "download_edavki_field_tracking_id",
	[EDavkiProvenanceField.DIVIDEND_AMOUNT]: "download_edavki_field_dividend_amount",
	[EDavkiProvenanceField.FOREIGN_TAX_PAID]: "download_edavki_field_foreign_tax_paid",
};

// The report flow's steps, as the stepper names them.
const reportStepKeys: Record<ReportStep, string> = {
	[ReportStep.UPLOAD]: "wizard_step_upload",
	[ReportStep.REVIEW]: "wizard_step_review",
	[ReportStep.CONFIGURE]: "wizard_step_configure",
	[ReportStep.DOWNLOAD]: "wizard_step_download",
};

// The i18n keys of the sentences about each enum value.
export const I18nKeys = {
	dropReason: dropReasonKeys,
	detailKind: detailKindKeys,
	warningGroup: warningGroupKeys,
	detailValueParams,
	dropCategory: dropCategoryKeys,
	eventKind: eventKindKeys,
	lotMatching: lotMatchingKeys,
	mark: markKeys,
	chipKind: chipKindKeys,
	detectedVerdict: detectedVerdictKeys,
	detectedDetail: detectedDetailKeys,
	detectedPart: detectedPartKeys,
	count: countKeys,
	nodeValue: nodeValueKeys,
	legSide: legSideKeys,
	stackKind: stackKindKeys,
	heading: headingKeys,
	laneLabels: laneLabelKeys,
	edavkiField: edavkiFieldKeys,
	reportStep: reportStepKeys,
};
