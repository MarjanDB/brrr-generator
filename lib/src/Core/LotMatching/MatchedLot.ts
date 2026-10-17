// The part of a trade a matched lot covers. `trade` is the original trade; `quantity` and
// `commission` are its share of the lot (negative quantity on the sold side).
export type LotLeg<T> = {
	trade: T;
	quantity: number;
	commission: number;
};

export type MatchedLot<T> = {
	acquired: LotLeg<T>;
	sold: LotLeg<T>;
};
