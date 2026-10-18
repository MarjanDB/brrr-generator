// Lot relief (cost basis) methods. PROVIDED takes the broker's lots, matched by whatever method the
// account uses there (FIFO, LIFO, specific identification, …).
export enum TaxAuthorityLotMatchingMethod {
	NONE = "NONE",
	PROVIDED = "PROVIDED",
	FIFO = "FIFO",
}
