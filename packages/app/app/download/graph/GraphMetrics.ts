// The sizes the placement works from. The defaults are the sketch's numbers; the view may tune them.
export type GraphMetrics = {
	nodeWidth: number;
	nodeHeight: number;
	// A pair card is its header plus two rows tall: the buy line and the sell line.
	pairHeaderHeight: number;
	pairRowHeight: number;
	columnGap: number;
	rowGap: number;
	bandGap: number;
	left: number;
	top: number;
};

export const defaultGraphMetrics: GraphMetrics = {
	nodeWidth: 162,
	nodeHeight: 38,
	pairHeaderHeight: 26,
	pairRowHeight: 25,
	columnGap: 58,
	rowGap: 12,
	bandGap: 26,
	left: 70,
	top: 30,
};
