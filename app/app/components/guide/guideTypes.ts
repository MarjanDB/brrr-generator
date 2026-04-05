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
