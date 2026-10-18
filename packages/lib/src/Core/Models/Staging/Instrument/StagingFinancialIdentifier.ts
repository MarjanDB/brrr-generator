import { FinancialIdentifierKey, type Isin, type Ticker } from "@brrr/Core/Models/Identifiers";

export class StagingFinancialIdentifier {
	public readonly isin: Isin | null;
	public readonly ticker: Ticker | null;
	public readonly name: string | null;

	public constructor(
		params: { isin?: Isin | null; ticker?: Ticker | null; name?: string | null } = {},
	) {
		this.isin = params.isin ?? null;
		this.ticker = params.ticker ?? null;
		this.name = params.name ?? null;
	}

	public isTheSameAs(other: StagingFinancialIdentifier): boolean {
		const hasIsin = this.isin !== null && other.isin !== null;
		const hasTicker = this.ticker !== null && other.ticker !== null;
		const hasName = this.name !== null && other.name !== null;

		// Do not match when Name differs (one has name, other has different or missing).
		if ((this.name === null) !== (other.name === null) || (hasName && this.name !== other.name)) {
			return false;
		}
		// Do not match when both have ISIN but they differ (e.g. ISIN change).
		if (hasIsin && this.isin !== other.isin) {
			return false;
		}

		const sameIsin = hasIsin && this.isin === other.isin;
		const sameTicker = hasTicker && this.ticker === other.ticker;
		const sameName = hasName && this.name === other.name;

		// Core-style branches when ISIN is present.
		const isinEquality = sameIsin && !hasTicker && !hasName;
		const tickerEquality = sameIsin && sameTicker && !hasName;
		const nameEquality = sameIsin && sameTicker && sameName;
		// Staging: same ticker matches when no name conflict (e.g. no ISIN from broker yet).
		const tickerOnlyEquality = sameTicker && (!hasName || sameName);

		return isinEquality || tickerEquality || nameEquality || tickerOnlyEquality;
	}

	// Map key: identifiers with the same ISIN, ticker and name share a key.
	public toKey(): FinancialIdentifierKey {
		return FinancialIdentifierKey.Schema.parse(
			`${this.isin ?? ""}|${this.ticker ?? ""}|${this.name ?? ""}`,
		);
	}

	public toString(): string {
		return `FinancialIdentifier(ISIN: ${this.isin}, Ticker: ${this.ticker}, Name: ${this.name})`;
	}
}
