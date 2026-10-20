<script setup lang="ts">
import {
	DropCategory,
	ProvenanceEventKind,
	ProvenanceField,
} from "@brrr/lib";
import { computed } from "vue";
import { ColorIntent } from "~/types/ui";

// The card's focused item: its facts, and what the report left out or warns about it.
const { t, locale } = useI18n();
const { focus, leftOut, warnings } = useInstrumentCard();
const { dropSentence, warningSentence, date: dateText } = useProvenanceText();

type Fact = { label: string; value: string };

const cashKinds: ProvenanceEventKind[] = [
	ProvenanceEventKind.DIVIDEND,
	ProvenanceEventKind.PAYMENT_IN_LIEU,
	ProvenanceEventKind.WITHHOLDING_TAX,
	ProvenanceEventKind.WITHHOLDING_TAX_ON_PAYMENT_IN_LIEU,
];

const facts = computed<Fact[]>(() => {
	const node = focus.node.value;
	if (node === null) {
		return [];
	}
	const result: Fact[] = [];
	const kind = Object.values(ProvenanceEventKind).find(
		(candidate) => candidate === ProvenanceFields.of(node, ProvenanceField.EVENT_KIND),
	);
	if (kind !== undefined) {
		result.push({ label: t("download_fact_kind"), value: t(I18nKeys.eventKind[kind]) });
	}
	const date =
		ProvenanceFields.of(node, ProvenanceField.DATE) ??
		ProvenanceFields.of(node, ProvenanceField.ACQUIRED_DATE);
	if (date !== null) {
		result.push({
			label: t("download_fact_date"),
			value: dateText(date),
		});
	}
	const quantity = ProvenanceFields.of(node, ProvenanceField.QUANTITY);
	const price = ProvenanceFields.of(node, ProvenanceField.PRICE);
	const currency = ProvenanceFields.of(node, ProvenanceField.CURRENCY) ?? "";
	if (kind !== undefined && cashKinds.includes(kind)) {
		// A cash transaction is one unit of its amount: show the amount, not a quantity and a price.
		const amount = ProvenanceFields.cashAmountOf(node);
		if (amount !== null) {
			const value = `${ProvenanceFields.formatNumber(amount, locale.value)} ${currency}`.trim();
			result.push({ label: t("download_fact_amount"), value });
		}
	} else {
		if (quantity !== null) {
			result.push({
				label: t("download_fact_quantity"),
				value: ProvenanceFields.formatNumber(quantity, locale.value),
			});
		}
		if (price !== null) {
			const value = `${ProvenanceFields.formatNumber(price, locale.value)} ${currency}`.trim();
			result.push({ label: t("download_fact_price"), value });
		}
	}
	const transaction = ProvenanceFields.of(node, ProvenanceField.TRANSACTION_ID);
	if (transaction !== null) {
		result.push({ label: t("download_fact_transaction_id"), value: transaction });
	}
	return result;
});

// Grey for what the report is expected to leave out, amber for what needs a look.
const categoryColors: Record<DropCategory, ColorIntent> = {
	[DropCategory.NOT_IN_THIS_REPORT]: ColorIntent.NEUTRAL,
	[DropCategory.NEEDS_A_LOOK]: ColorIntent.WARNING,
};
</script>

<template>
  <div class="px-4 py-3 flex flex-col gap-3">
    <dl v-if="facts.length > 0" class="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
      <template v-for="fact in facts" :key="fact.label">
        <dt class="text-ink-muted">{{ fact.label }}</dt>
        <dd class="text-ink tabular-nums">{{ fact.value }}</dd>
      </template>
    </dl>

    <ul v-if="leftOut.length > 0 || warnings.length > 0" class="flex flex-col gap-1.5">
      <AppCallout
        v-for="(item, index) in leftOut"
        :key="`left-out-${index}`"
        as="li"
        :color="categoryColors[item.category]"
        class="flex items-center gap-2"
      >
        <span class="font-medium">{{ t(I18nKeys.dropCategory[item.category]) }}</span>
        <span>{{ dropSentence(item.drop) }}</span>
      </AppCallout>
      <AppCallout
        v-for="(warning, index) in warnings"
        :key="`warning-${index}`"
        as="li"
        :color="ColorIntent.WARNING"
        class="flex items-center gap-2"
      >
        <span class="i-mdi-alert-outline" aria-hidden="true" />
        {{ warningSentence(warning) }}
      </AppCallout>
    </ul>
  </div>
</template>
