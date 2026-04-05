export type TextSegment = {
	type: "text";
	textKey: string;
};

export type LinkSegment = {
	type: "link";
	textKey: string;
	url: string;
};

export type Segment = TextSegment | LinkSegment;

export type GuideStep = {
	titleKey: string;
	segments: Segment[];
	imageUrls?: string[];
};

export type BrokerGuide = {
	id: string;
	nameKey: string;
	taglineKey: string;
	iconUrl: string;
	steps: GuideStep[];
};

const IBKR_SCREENSHOTS = "/screenshots/brokers/ibkr";

export const BROKER_GUIDES: BrokerGuide[] = [
	{
		id: "ibkr",
		nameKey: "broker_ibkr_name",
		taglineKey: "broker_ibkr_tagline",
		iconUrl: "/icons/brokers/ibkr.svg",
		steps: [
			{
				titleKey: "broker_ibkr_step1_title",
				segments: [{ type: "text", textKey: "broker_ibkr_step1_description" }],
				imageUrls: [`${IBKR_SCREENSHOTS}/export_01_flex-queries.png`],
			},
			{
				titleKey: "broker_ibkr_step2_title",
				segments: [{ type: "text", textKey: "broker_ibkr_step2_description" }],
				imageUrls: [`${IBKR_SCREENSHOTS}/export_02_create-flex-query.png`],
			},
			{
				titleKey: "broker_ibkr_step3_title",
				segments: [{ type: "text", textKey: "broker_ibkr_step3_description" }],
				imageUrls: [
					`${IBKR_SCREENSHOTS}/export_03_select-sections.png`,
					`${IBKR_SCREENSHOTS}/export_04_cash-transactions.png`,
					`${IBKR_SCREENSHOTS}/export_05_corporate-actions.png`,
					`${IBKR_SCREENSHOTS}/export_06_trades.png`,
				],
			},
			{
				titleKey: "broker_ibkr_step4_title",
				segments: [{ type: "text", textKey: "broker_ibkr_step4_description" }],
				imageUrls: [
					`${IBKR_SCREENSHOTS}/export_07_query-configuration.png`,
					`${IBKR_SCREENSHOTS}/export_08_account-configuration.png`,
				],
			},
			{
				titleKey: "broker_ibkr_step5_title",
				segments: [{ type: "text", textKey: "broker_ibkr_step5_description" }],
				imageUrls: [`${IBKR_SCREENSHOTS}/export_09_save-query.png`],
			},
			{
				titleKey: "broker_ibkr_step6_title",
				segments: [{ type: "text", textKey: "broker_ibkr_step6_description" }],
				imageUrls: [
					`${IBKR_SCREENSHOTS}/export_10_run-query.png`,
					`${IBKR_SCREENSHOTS}/export_11_query-custom-date-range.png`,
					`${IBKR_SCREENSHOTS}/export_12_set-date-range-year.png`,
					`${IBKR_SCREENSHOTS}/export_13_run_custom_query.png`,
				],
			},
			{
				titleKey: "broker_ibkr_step7_title",
				segments: [{ type: "text", textKey: "broker_ibkr_step7_description" }],
				imageUrls: [`${IBKR_SCREENSHOTS}/export_14_downloaded.png`],
			},
		],
	},
];
