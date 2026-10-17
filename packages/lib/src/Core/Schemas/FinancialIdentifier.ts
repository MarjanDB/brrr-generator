import type { StagingFinancialIdentifier } from "@brrr/Core/Schemas/Staging/StagingFinancialIdentifier";

export class FinancialIdentifier {
	public readonly isin: string | null;
	public readonly ticker: string | null;
	public readonly name: string | null;

	constructor(params: { isin?: string | null; ticker?: string | null; name?: string | null } = {}) {
		this.isin = params.isin ?? null;
		this.ticker = params.ticker ?? null;
		this.name = params.name ?? null;
		if (this.isin === null && this.ticker === null && this.name === null) {
			throw new Error("At least one of isin, ticker, or name must be provided");
		}
	}

	// While ISIN and the Ticker are enough for identifying a company ticker, it is not enough
	// to identify a specific traded instrument (options with different strike prices / expiration dates).
	// Use isTheSameAs for strict matching where ISIN + ticker are both needed.
	isTheSameAs(other: FinancialIdentifier): boolean {
		const hasIsin = this.isin !== null && other.isin !== null;
		const hasTicker = this.ticker !== null && other.ticker !== null;
		const hasName = this.name !== null && other.name !== null;

		const sameIsin = hasIsin && this.isin === other.isin;
		const sameTicker = hasTicker && this.ticker === other.ticker;
		const sameName = hasName && this.name === other.name;

		const isinEquality = sameIsin && !hasTicker && !hasName;
		const tickerEquality = sameIsin && sameTicker && !hasName;
		const nameEquality = sameIsin && sameTicker && sameName;

		return isinEquality || tickerEquality || nameEquality;
	}

	// True when both have ISIN and it is the same. Use for rename/corporate-action resolution
	// where only ISIN identifies the instrument (e.g. ticker may differ: RKLB.OLD vs RKLB).
	// Not for options/distinct instruments where ISIN + ticker are both needed.
	sameInstrumentByIsin(other: FinancialIdentifier): boolean {
		return this.isin !== null && other.isin !== null && this.isin === other.isin;
	}

	// Map key: identifiers with the same ISIN, ticker and name share a key.
	toKey(): string {
		return `${this.isin ?? ""}|${this.ticker ?? ""}|${this.name ?? ""}`;
	}

	static fromStagingIdentifier(identifier: StagingFinancialIdentifier): FinancialIdentifier {
		return new FinancialIdentifier({
			isin: identifier.isin,
			ticker: identifier.ticker,
			name: identifier.name,
		});
	}

	toString(): string {
		return `FinancialIdentifier(ISIN: ${this.isin}, Ticker: ${this.ticker}, Name: ${this.name})`;
	}
}
