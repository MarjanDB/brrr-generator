import type { TradeEventCashTransaction } from "@brrr/Core/Models/Events/CashTransaction/TradeEventCashTransaction";
import { TradeEventCashTransactionDividend } from "@brrr/Core/Models/Events/CashTransaction/TradeEventCashTransactionDividend";
import { TradeEventCashTransactionPaymentInLieuOfDividend } from "@brrr/Core/Models/Events/CashTransaction/TradeEventCashTransactionPaymentInLieuOfDividend";
import { TradeEventCashTransactionWithholdingTax } from "@brrr/Core/Models/Events/CashTransaction/TradeEventCashTransactionWithholdingTax";
import { TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend } from "@brrr/Core/Models/Events/CashTransaction/TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend";
import type { TradeEventDerivative } from "@brrr/Core/Models/Events/Derivative/TradeEventDerivative";
import { TradeEventDerivativeAcquired } from "@brrr/Core/Models/Events/Derivative/TradeEventDerivativeAcquired";
import { TradeEventDerivativeSold } from "@brrr/Core/Models/Events/Derivative/TradeEventDerivativeSold";
import type { TradeEventStock } from "@brrr/Core/Models/Events/Stock/TradeEventStock";
import { TradeEventStockAcquired } from "@brrr/Core/Models/Events/Stock/TradeEventStockAcquired";
import { TradeEventStockSold } from "@brrr/Core/Models/Events/Stock/TradeEventStockSold";
import type { TradeEvent } from "@brrr/Core/Models/Events/TradeEvent";
import { ShortLong } from "@brrr/Core/Models/Lots/ShortLong";
import { TaxLot, type TaxLotDerivative, type TaxLotStock } from "@brrr/Core/Models/Lots/TaxLot";
import type { StagingTradeEventCashTransaction } from "@brrr/Core/Models/Staging/Events/CashTransaction/StagingTradeEventCashTransaction";
import { StagingTradeEventCashTransactionDividend } from "@brrr/Core/Models/Staging/Events/CashTransaction/StagingTradeEventCashTransactionDividend";
import { StagingTradeEventCashTransactionPaymentInLieuOfDividend } from "@brrr/Core/Models/Staging/Events/CashTransaction/StagingTradeEventCashTransactionPaymentInLieuOfDividend";
import { StagingTradeEventCashTransactionWithholdingTax } from "@brrr/Core/Models/Staging/Events/CashTransaction/StagingTradeEventCashTransactionWithholdingTax";
import type { StagingTradeEventDerivative } from "@brrr/Core/Models/Staging/Events/Derivative/StagingTradeEventDerivative";
import { StagingTradeEventDerivativeAcquired } from "@brrr/Core/Models/Staging/Events/Derivative/StagingTradeEventDerivativeAcquired";
import type { StagingTradeEventStock } from "@brrr/Core/Models/Staging/Events/Stock/StagingTradeEventStock";
import { StagingTradeEventStockAcquired } from "@brrr/Core/Models/Staging/Events/Stock/StagingTradeEventStockAcquired";
import type { StagingTaxLot } from "@brrr/Core/Models/Staging/Lots/StagingTaxLot";
import { CashTransactionLabel, ProvenanceLabels } from "@brrr/Core/Utils/ProvenanceLabels";
import type { IProvenanceRecorder } from "@brrr/Provenance/Interfaces/IProvenanceRecorder";
import { ProvenanceChange } from "@brrr/Provenance/Models/ProvenanceChange";
import { ProvenanceStage } from "@brrr/Provenance/Models/ProvenanceIdentifiers";
import { ProvenanceNodeKind } from "@brrr/Provenance/Models/ProvenanceNodeKind";

const STAGE = ProvenanceStage.Schema.parse("StagingToCore");

function track(
	provenance: IProvenanceRecorder,
	staged: object,
	core: object,
	kind: ProvenanceNodeKind,
	label: string,
): void {
	provenance.node(core, kind, label, {});
	provenance.derive([staged], core, ProvenanceChange.CONVERTED, STAGE, null);
}

// Staging events and lots carry the broker's view of an instrument; these turn them into the
// core model the tax authorities work with.

function toCoreTradeFields(
	input: StagingTradeEventStock | StagingTradeEventDerivative | StagingTradeEventCashTransaction,
) {
	return {
		id: input.id,
		assetClass: input.assetClass,
		date: input.date,
		multiplier: input.multiplier,
		exchangedMoney: input.exchangedMoney,
		provenance: [],
	};
}

export function toCoreStockTrade(
	input: StagingTradeEventStock,
	provenance: IProvenanceRecorder,
): TradeEventStock {
	const fields = toCoreTradeFields(input);
	const acquired = input instanceof StagingTradeEventStockAcquired;
	const trade = acquired
		? new TradeEventStockAcquired({ ...fields, acquisitionMethod: input.acquisitionMethod })
		: new TradeEventStockSold(fields);
	track(
		provenance,
		input,
		trade,
		ProvenanceNodeKind.EVENT,
		ProvenanceLabels.trade(
			input.assetClass,
			acquired,
			input.id,
			input.exchangedMoney.quantity,
			input.financialIdentifier.ticker,
		),
	);
	return trade;
}

export function toCoreDerivativeTrade(
	input: StagingTradeEventDerivative,
	provenance: IProvenanceRecorder,
): TradeEventDerivative {
	const fields = toCoreTradeFields(input);
	const acquired = input instanceof StagingTradeEventDerivativeAcquired;
	const trade = acquired
		? new TradeEventDerivativeAcquired({ ...fields, acquisitionMethod: input.acquisitionMethod })
		: new TradeEventDerivativeSold(fields);
	track(
		provenance,
		input,
		trade,
		ProvenanceNodeKind.EVENT,
		ProvenanceLabels.trade(
			input.assetClass,
			acquired,
			input.id,
			input.exchangedMoney.quantity,
			input.financialIdentifier.ticker,
		),
	);
	return trade;
}

export function toCoreCashTransaction(
	input: StagingTradeEventCashTransaction,
	provenance: IProvenanceRecorder,
): TradeEventCashTransaction {
	const fields = {
		...toCoreTradeFields(input),
		actionId: input.actionId,
		transactionId: input.transactionId,
		listingExchange: input.listingExchange,
	};
	let transaction: TradeEventCashTransaction;
	let label: CashTransactionLabel;
	if (input instanceof StagingTradeEventCashTransactionDividend) {
		transaction = new TradeEventCashTransactionDividend({
			...fields,
			dividendType: input.dividendType,
		});
		label = CashTransactionLabel.DIVIDEND;
	} else if (input instanceof StagingTradeEventCashTransactionWithholdingTax) {
		transaction = new TradeEventCashTransactionWithholdingTax(fields);
		label = CashTransactionLabel.WITHHOLDING_TAX;
	} else if (input instanceof StagingTradeEventCashTransactionPaymentInLieuOfDividend) {
		transaction = new TradeEventCashTransactionPaymentInLieuOfDividend({
			...fields,
			dividendType: input.dividendType,
		});
		label = CashTransactionLabel.PAYMENT_IN_LIEU;
	} else {
		transaction = new TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend(fields);
		label = CashTransactionLabel.WITHHOLDING_TAX_ON_PAYMENT_IN_LIEU;
	}
	track(
		provenance,
		input,
		transaction,
		ProvenanceNodeKind.EVENT,
		ProvenanceLabels.cash(label, input.id, input.financialIdentifier.ticker),
	);
	return transaction;
}

// A broker lot names its buy by transaction ID and its sell only by date.
function matchLotTrades<A extends TradeEvent, S extends TradeEvent>(
	input: StagingTaxLot,
	buys: A[],
	sells: S[],
): { acquired: A; sold: S } | null {
	const acquiredId = input.acquired.id;
	const soldAt = input.sold.dateTime;
	if (acquiredId === null || soldAt === null) {
		return null;
	}

	const acquired = buys.find((trade) => trade.id === acquiredId);
	const sold = sells.find((trade) => trade.date.toMillis() === soldAt.toMillis());
	return acquired && sold ? { acquired, sold } : null;
}

function toCoreLot<A extends TradeEvent, S extends TradeEvent>(
	input: StagingTaxLot,
	trades: { acquired: A; sold: S },
	provenance: IProvenanceRecorder,
): TaxLot<A, S> {
	const lot = new TaxLot({
		id: input.id,
		quantity: input.quantity,
		acquired: trades.acquired,
		sold: trades.sold,
		shortLongType: ShortLong.LONG,
		provenance: [],
	});
	track(
		provenance,
		input,
		lot,
		ProvenanceNodeKind.LOT,
		ProvenanceLabels.lot(input.id, input.quantity, input.financialIdentifier.ticker),
	);
	return lot;
}

export function toCoreStockLot(
	input: StagingTaxLot,
	trades: TradeEventStock[],
	provenance: IProvenanceRecorder,
): TaxLotStock {
	const matched = matchLotTrades(
		input,
		trades.filter((t): t is TradeEventStockAcquired => t instanceof TradeEventStockAcquired),
		trades.filter((t): t is TradeEventStockSold => !(t instanceof TradeEventStockAcquired)),
	);
	if (matched === null) {
		throw new Error(`LookupError: Failed to match stock lot (ID: ${input.id})`);
	}
	return toCoreLot(input, matched, provenance);
}

export function toCoreDerivativeLot(
	input: StagingTaxLot,
	trades: TradeEventDerivative[],
	provenance: IProvenanceRecorder,
): TaxLotDerivative {
	const matched = matchLotTrades(
		input,
		trades.filter(
			(t): t is TradeEventDerivativeAcquired => t instanceof TradeEventDerivativeAcquired,
		),
		trades.filter(
			(t): t is TradeEventDerivativeSold => !(t instanceof TradeEventDerivativeAcquired),
		),
	);
	if (matched === null) {
		throw new Error(`LookupError: Failed to match derivative lot (ID: ${input.id})`);
	}
	return toCoreLot(input, matched, provenance);
}
