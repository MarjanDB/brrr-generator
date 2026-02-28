import type { StagingFinancialIdentifier } from "./staging/StagingFinancialIdentifier.ts";

export class FinancialIdentifier {
	private _isin: string | null;
	private _ticker: string | null;
	private _name: string | null;

	constructor(params: { isin?: string | null; ticker?: string | null; name?: string | null } = {}) {
		this._isin = params.isin ?? null;
		this._ticker = params.ticker ?? null;
		this._name = params.name ?? null;
		if (this._isin === null && this._ticker === null && this._name === null) {
			throw new Error("At least one of isin, ticker, or name must be provided");
		}
	}

	setIsin(isin: string | null): void {
		this._isin = isin;
	}

	setTicker(ticker: string | null): void {
		this._ticker = ticker;
	}

	setName(name: string | null): void {
		this._name = name;
	}

	getIsin(): string | null {
		return this._isin;
	}

	getTicker(): string | null {
		return this._ticker;
	}

	getName(): string | null {
		return this._name;
	}

	isTheSameAs(other: FinancialIdentifier): boolean {
		const hasIsin = this._isin !== null && other._isin !== null;
		const hasTicker = this._ticker !== null && other._ticker !== null;
		const hasName = this._name !== null && other._name !== null;

		const sameIsin = hasIsin && this._isin === other._isin;
		const sameTicker = hasTicker && this._ticker === other._ticker;
		const sameName = hasName && this._name === other._name;

		const isinEquality = sameIsin && !hasTicker && !hasName;
		const tickerEquality = sameIsin && sameTicker && !hasName;
		const nameEquality = sameIsin && sameTicker && sameName;

		return isinEquality || tickerEquality || nameEquality;
	}

	sameInstrumentByIsin(other: FinancialIdentifier): boolean {
		return this._isin !== null && other._isin !== null && this._isin === other._isin;
	}

	equals(other: FinancialIdentifier): boolean {
		return this.isTheSameAs(other);
	}

	/** String key for use as Map key (replaces Python __hash__) */
	toKey(): string {
		return `${this._isin ?? ""}|${this._ticker ?? ""}|${this._name ?? ""}`;
	}

	static fromStagingIdentifier(identifier: StagingFinancialIdentifier): FinancialIdentifier {
		return new FinancialIdentifier({
			isin: identifier.getIsin(),
			ticker: identifier.getTicker(),
			name: identifier.getName(),
		});
	}

	toString(): string {
		return `FinancialIdentifier(ISIN: ${this._isin}, Ticker: ${this._ticker}, Name: ${this._name})`;
	}

	compareTo(other: FinancialIdentifier): number {
		const selfValues = [this._isin, this._ticker, this._name];
		const otherValues = [other._isin, other._ticker, other._name];

		for (let i = 0; i < selfValues.length; i++) {
			const sv = selfValues[i];
			const ov = otherValues[i];
			if (sv !== null && ov !== null) {
				if (sv < ov) return -1;
				if (sv > ov) return 1;
			}
		}
		return 0;
	}
}
