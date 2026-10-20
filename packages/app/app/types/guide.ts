import type { TaxAuthorityId } from "@brrr/lib";

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

// A broker's export guide, shown on the landing page and the upload step.
export type BrokerGuide = {
	id: string;
	nameKey: string;
	modalTitleKey: string;
	taglineKey: string;
	iconUrl: string;
	// What the site reads from its export, as i18n keys.
	readKeys: string[];
	steps: GuideStep[];
};

// A tax authority's submission guide for one form.
export type TaxAuthorityGuide = {
	authorityId: TaxAuthorityId;
	reportTypeId: string;
	nameKey: string;
	steps: GuideStep[];
};
