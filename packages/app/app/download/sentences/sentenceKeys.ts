import {
	DropCategory,
	DropReason,
	ProvenanceDetailKind,
	ProvenanceDetailValue,
	ProvenanceEventKind,
	TaxAuthorityLotMatchingMethod,
} from "@brrr/lib";

// The i18n key of each enum value. Record<Enum, string> makes a new value fail to compile until it
// has a key.
export const dropReasonKeys: Record<DropReason, string> = {
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

export const detailKindKeys: Record<ProvenanceDetailKind, string> = {
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

// The name each value of a detail has in its sentence's text: {error}, {assetClass}, {date}, ...
export const detailValueParams: Record<ProvenanceDetailValue, string> = {
	[ProvenanceDetailValue.ERROR]: "error",
	[ProvenanceDetailValue.ASSET_CLASS]: "assetClass",
	[ProvenanceDetailValue.DATE]: "date",
	[ProvenanceDetailValue.LOT_MATCHING_METHOD]: "method",
	[ProvenanceDetailValue.ISIN]: "isin",
};

export const dropCategoryKeys: Record<DropCategory, string> = {
	[DropCategory.NOT_IN_THIS_REPORT]: "download_category_not_in_report",
	[DropCategory.NEEDS_A_LOOK]: "download_category_needs_look",
};

export const eventKindKeys: Record<ProvenanceEventKind, string> = {
	[ProvenanceEventKind.ACQUIRED]: "download_fact_kind_acquired",
	[ProvenanceEventKind.SOLD]: "download_fact_kind_sold",
	[ProvenanceEventKind.DIVIDEND]: "download_fact_kind_dividend",
	[ProvenanceEventKind.PAYMENT_IN_LIEU]: "download_fact_kind_payment_in_lieu",
	[ProvenanceEventKind.WITHHOLDING_TAX]: "download_fact_kind_withholding_tax",
	[ProvenanceEventKind.WITHHOLDING_TAX_ON_PAYMENT_IN_LIEU]:
		"download_fact_kind_withholding_tax_on_payment_in_lieu",
};

export const lotMatchingKeys: Record<TaxAuthorityLotMatchingMethod, string> = {
	[TaxAuthorityLotMatchingMethod.NONE]: "download_lot_matching_none",
	[TaxAuthorityLotMatchingMethod.FIFO]: "download_lot_matching_fifo",
	[TaxAuthorityLotMatchingMethod.PROVIDED]: "download_lot_matching_provided",
};
