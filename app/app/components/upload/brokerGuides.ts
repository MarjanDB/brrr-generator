export type GuideStep = {
	titleKey: string;
	descriptionKey: string;
	imageUrl?: string;
	linkUrl?: string;
	linkLabelKey?: string;
};

export type BrokerGuide = {
	id: string;
	nameKey: string;
	taglineKey: string;
	iconUrl: string;
	steps: GuideStep[];
};

export const BROKER_GUIDES: BrokerGuide[] = [
	{
		id: "ibkr",
		nameKey: "broker_ibkr_name",
		taglineKey: "broker_ibkr_tagline",
		iconUrl: "/icons/brokers/ibkr.svg",
		steps: [
			{
				titleKey: "broker_ibkr_step1_title",
				descriptionKey: "broker_ibkr_step1_description",
			},
			{
				titleKey: "broker_ibkr_step2_title",
				descriptionKey: "broker_ibkr_step2_description",
				linkUrl: undefined,
				linkLabelKey: "broker_ibkr_step2_link",
			},
			{
				titleKey: "broker_ibkr_step3_title",
				descriptionKey: "broker_ibkr_step3_description",
			},
			{
				titleKey: "broker_ibkr_step4_title",
				descriptionKey: "broker_ibkr_step4_description",
			},
			{
				titleKey: "broker_ibkr_step5_title",
				descriptionKey: "broker_ibkr_step5_description",
			},
		],
	},
];
