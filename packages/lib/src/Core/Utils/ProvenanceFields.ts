import type { TradeEventBase } from "@brrr/Core/Models/Events/TradeEventBase";
import type { IdentifierRelationship } from "@brrr/Core/Models/IdentifierRelationships/IdentifierRelationship";
import type { IdentifierRelationshipSplit } from "@brrr/Core/Models/IdentifierRelationships/IdentifierRelationshipSplit";
import { AssetClass } from "@brrr/Core/Models/Instrument/AssetClass";
import type { FinancialIdentifier } from "@brrr/Core/Models/Instrument/FinancialIdentifier";
import type { OptionContract } from "@brrr/Core/Models/Instrument/OptionContract";
import type { TaxLot } from "@brrr/Core/Models/Lots/TaxLot";
import type { ProvenanceEventKind } from "@brrr/Provenance/Models/ProvenanceEventKind";
import { ProvenanceField } from "@brrr/Provenance/Models/ProvenanceField";
import type { ProvenanceLegSide } from "@brrr/Provenance/Models/ProvenanceLegSide";
import type { ValidDateTime } from "@brrr/Utils/DateTime";

function day(date: ValidDateTime): string {
	return date.toFormat("yyyy-MM-dd");
}

// A null part of an identifier leaves its key out.
function identifierFields(identifier: FinancialIdentifier): Record<string, string> {
	const fields: Record<string, string> = {};
	if (identifier.isin !== null) fields[ProvenanceField.ISIN] = identifier.isin;
	if (identifier.ticker !== null) fields[ProvenanceField.TICKER] = identifier.ticker;
	if (identifier.name !== null) fields[ProvenanceField.NAME] = identifier.name;
	return fields;
}

// The facts the read side and the lot matching put on their provenance nodes, keyed by
// ProvenanceField. Values are strings: dates are yyyy-MM-dd, numbers are String(value).
export const ProvenanceFields = {
	event(event: TradeEventBase, kind: ProvenanceEventKind): Record<string, string> {
		const money = event.exchangedMoney;
		return {
			[ProvenanceField.EVENT_KIND]: kind,
			[ProvenanceField.ASSET_CLASS]: event.assetClass,
			[ProvenanceField.DATE]: day(event.date),
			[ProvenanceField.QUANTITY]: String(money.quantity),
			[ProvenanceField.PRICE]: String(money.priceInBase / money.fxRateToBase),
			[ProvenanceField.PRICE_IN_BASE]: String(money.priceInBase),
			[ProvenanceField.CURRENCY]: money.currency,
			[ProvenanceField.TRANSACTION_ID]: event.id,
		};
	},

	lot(lot: TaxLot<TradeEventBase, TradeEventBase>): Record<string, string> {
		return {
			[ProvenanceField.ACQUIRED_DATE]: day(lot.acquired.date),
			[ProvenanceField.SOLD_DATE]: day(lot.sold.date),
			[ProvenanceField.QUANTITY]: String(lot.quantity),
		};
	},

	grouping(identifier: FinancialIdentifier): Record<string, string> {
		return identifierFields(identifier);
	},

	derivativeGrouping(
		identifier: FinancialIdentifier,
		contract: OptionContract,
	): Record<string, string> {
		return {
			...identifierFields(identifier),
			[ProvenanceField.ASSET_CLASS]: AssetClass.OPTION,
			[ProvenanceField.UNDERLYING_SYMBOL]: contract.underlyingSymbol,
			[ProvenanceField.EXPIRY]: day(contract.expiry),
			[ProvenanceField.STRIKE]: String(contract.strike),
			[ProvenanceField.OPTION_RIGHT]: contract.optionRight,
			[ProvenanceField.MULTIPLIER]: String(contract.multiplier),
		};
	},

	corporateAction(
		relationship: IdentifierRelationship | IdentifierRelationshipSplit,
	): Record<string, string> {
		const fields: Record<string, string> = {
			[ProvenanceField.CORPORATE_ACTION_KIND]: relationship.changeType,
			[ProvenanceField.DATE]: day(relationship.effectiveDate),
		};
		const { fromIdentifier, toIdentifier } = relationship;
		if (fromIdentifier.isin !== null) fields[ProvenanceField.FROM_ISIN] = fromIdentifier.isin;
		if (toIdentifier.isin !== null) fields[ProvenanceField.TO_ISIN] = toIdentifier.isin;
		if (fromIdentifier.ticker !== null) fields[ProvenanceField.FROM_TICKER] = fromIdentifier.ticker;
		if (toIdentifier.ticker !== null) fields[ProvenanceField.TO_TICKER] = toIdentifier.ticker;
		if ("quantityBefore" in relationship) {
			fields[ProvenanceField.SPLIT_BEFORE] = String(relationship.quantityBefore);
			fields[ProvenanceField.SPLIT_AFTER] = String(relationship.quantityAfter);
		}
		return fields;
	},

	matchedLot(quantity: number): Record<string, string> {
		return { [ProvenanceField.QUANTITY]: String(quantity) };
	},

	leg(side: ProvenanceLegSide, quantity: number): Record<string, string> {
		return {
			[ProvenanceField.LEG_SIDE]: side,
			[ProvenanceField.QUANTITY]: String(quantity),
		};
	},
};
