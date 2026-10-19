// Which side of the mark a landing card sits on: the brokers left of it, the tax offices right.
export enum LandingSide {
	BROKER = "broker",
	OFFICE = "office",
}

// Which edge of a connector's box sits at its card's middle.
export enum LandingConnectorAnchor {
	TOP = "top",
	BOTTOM = "bottom",
}

// The box beside a landing card that its arrow is drawn in, from the card's middle to the card's
// own point on the mark, in CSS a server can render: its height is a calc() on the card's own
// height, so nothing is measured.
export type LandingConnector = {
	// The arrow's two ends are at the same height.
	level: boolean;
	anchor: LandingConnectorAnchor;
	height: string;
	// Whether the arrow's left end is at the box's top; its right end, with the arrowhead, is at the
	// other edge.
	leftEndAtTop: boolean;
	// The arrow in a 100 by 100 box stretched over the connector's.
	curve: string;
};
