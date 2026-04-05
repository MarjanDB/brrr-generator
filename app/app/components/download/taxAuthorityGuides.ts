import type { GuideStep } from "~/components/guide/guideTypes";

const SLOVENIA_SCREENSHOTS = "/screenshots/tax-authorities/slovenia-edavki";

export type TaxAuthorityGuide = {
	authorityId: string;
	reportTypeId: string;
	nameKey: string;
	steps: GuideStep[];
};

export const TAX_AUTHORITY_GUIDES: TaxAuthorityGuide[] = [
	{
		authorityId: "slovenia",
		reportTypeId: "kdvp",
		nameKey: "ta_slovenia_kdvp_guide_name",
		steps: [
			{
				titleKey: "ta_slovenia_kdvp_step1_title",
				segments: [{ type: "text", textKey: "ta_slovenia_kdvp_step1_description" }],
			},
			{
				titleKey: "ta_slovenia_kdvp_step2_title",
				segments: [{ type: "text", textKey: "ta_slovenia_kdvp_step2_description" }],
				imageUrls: [`${SLOVENIA_SCREENSHOTS}/submitting_01_finding-upload.png`],
			},
			{
				titleKey: "ta_slovenia_kdvp_step3_title",
				segments: [{ type: "text", textKey: "ta_slovenia_kdvp_step3_description" }],
				imageUrls: [`${SLOVENIA_SCREENSHOTS}/submitting_02_kdvp_file-upload.png`],
			},
			{
				titleKey: "ta_slovenia_kdvp_step4_title",
				segments: [{ type: "text", textKey: "ta_slovenia_kdvp_step4_description" }],
			},
		],
	},
	{
		authorityId: "slovenia",
		reportTypeId: "div",
		nameKey: "ta_slovenia_div_guide_name",
		steps: [
			{
				titleKey: "ta_slovenia_div_step1_title",
				segments: [{ type: "text", textKey: "ta_slovenia_div_step1_description" }],
			},
			{
				titleKey: "ta_slovenia_div_step2_title",
				segments: [{ type: "text", textKey: "ta_slovenia_div_step2_description" }],
				imageUrls: [`${SLOVENIA_SCREENSHOTS}/submitting_01_finding-upload.png`],
			},
			{
				titleKey: "ta_slovenia_div_step3_title",
				segments: [{ type: "text", textKey: "ta_slovenia_div_step3_description" }],
				imageUrls: [`${SLOVENIA_SCREENSHOTS}/submitting_02_div_file-upload.png`],
			},
			{
				titleKey: "ta_slovenia_div_step4_title",
				segments: [{ type: "text", textKey: "ta_slovenia_div_step4_description" }],
			},
		],
	},
	{
		authorityId: "slovenia",
		reportTypeId: "ifi",
		nameKey: "ta_slovenia_ifi_guide_name",
		steps: [
			{
				titleKey: "ta_slovenia_ifi_step1_title",
				segments: [{ type: "text", textKey: "ta_slovenia_ifi_step1_description" }],
			},
			{
				titleKey: "ta_slovenia_ifi_step2_title",
				segments: [{ type: "text", textKey: "ta_slovenia_ifi_step2_description" }],
				imageUrls: [`${SLOVENIA_SCREENSHOTS}/submitting_01_finding-upload.png`],
			},
			{
				titleKey: "ta_slovenia_ifi_step3_title",
				segments: [{ type: "text", textKey: "ta_slovenia_ifi_step3_description" }],
				imageUrls: [`${SLOVENIA_SCREENSHOTS}/submitting_02_ifi_file-upload.png`],
			},
			{
				titleKey: "ta_slovenia_ifi_step4_title",
				segments: [{ type: "text", textKey: "ta_slovenia_ifi_step4_description" }],
			},
		],
	},
];

export function findTaxAuthorityGuide(
	authorityId: string,
	reportTypeId: string,
): TaxAuthorityGuide | undefined {
	return TAX_AUTHORITY_GUIDES.find(
		(g) => g.authorityId === authorityId && g.reportTypeId === reportTypeId,
	);
}
