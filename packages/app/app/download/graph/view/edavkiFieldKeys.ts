import { EDavkiProvenanceField } from "@brrr/lib";

// The i18n key of each field a report line carries, named as the form names it.
export const edavkiFieldKeys: Record<EDavkiProvenanceField, string> = {
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
