<script setup lang="ts">
import {
	DropCategory,
	ProvenanceEventKind,
	ProvenanceField,
	type ProvenanceNode,
	type ProvenanceWarning,
	type ReportLeftOut,
} from "@brrr/lib";
import { computed } from "vue";

const props = defineProps<{
	node: ProvenanceNode;
	leftOut: ReportLeftOut[];
	warnings: ProvenanceWarning[];
}>();

const { t, locale } = useI18n();
const { dropSentence, warningSentence, date: dateText } = useProvenanceText();

type Fact = { label: string; value: string };

const cashKinds: ProvenanceEventKind[] = [
	ProvenanceEventKind.DIVIDEND,
	ProvenanceEventKind.PAYMENT_IN_LIEU,
	ProvenanceEventKind.WITHHOLDING_TAX,
	ProvenanceEventKind.WITHHOLDING_TAX_ON_PAYMENT_IN_LIEU,
];

const facts = computed<Fact[]>(() => {
	const result: Fact[] = [];
	const kind = Object.values(ProvenanceEventKind).find(
		(candidate) => candidate === fieldOf(props.node, ProvenanceField.EVENT_KIND),
	);
	if (kind !== undefined) {
		result.push({ label: t("download_fact_kind"), value: t(eventKindKeys[kind]) });
	}
	const date =
		fieldOf(props.node, ProvenanceField.DATE) ?? fieldOf(props.node, ProvenanceField.ACQUIRED_DATE);
	if (date !== null) {
		result.push({
			label: t("download_fact_date"),
			value: dateText(date),
		});
	}
	const quantity = fieldOf(props.node, ProvenanceField.QUANTITY);
	const price = fieldOf(props.node, ProvenanceField.PRICE);
	const currency = fieldOf(props.node, ProvenanceField.CURRENCY) ?? "";
	if (kind !== undefined && cashKinds.includes(kind)) {
		// A cash transaction is one unit of its amount: show the amount, not a quantity and a price.
		if (price !== null) {
			const amount = formatNumber(String(Number(price) * Number(quantity ?? "1")), locale.value);
			result.push({ label: t("download_fact_amount"), value: `${amount} ${currency}`.trim() });
		}
	} else {
		if (quantity !== null) {
			result.push({ label: t("download_fact_quantity"), value: formatNumber(quantity, locale.value) });
		}
		if (price !== null) {
			const value = `${formatNumber(price, locale.value)} ${currency}`.trim();
			result.push({ label: t("download_fact_price"), value });
		}
	}
	const transaction = fieldOf(props.node, ProvenanceField.TRANSACTION_ID);
	if (transaction !== null) {
		result.push({ label: t("download_fact_transaction_id"), value: transaction });
	}
	return result;
});

// Written out so UnoCSS sees them: grey for what the report is expected to leave out, amber for
// what needs a look.
const categoryClasses: Record<DropCategory, string> = {
	[DropCategory.NOT_IN_THIS_REPORT]: "bg-neutral-soft text-neutral-ink",
	[DropCategory.NEEDS_A_LOOK]: "bg-warning-soft text-warning-ink",
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
      <li
        v-for="(item, index) in leftOut"
        :key="`left-out-${index}`"
        class="flex items-center gap-2 rounded-sm px-2 py-1 text-sm"
        :class="categoryClasses[item.category]"
      >
        <span class="font-medium">{{ t(dropCategoryKeys[item.category]) }}</span>
        <span>{{ dropSentence(item.drop) }}</span>
      </li>
      <li
        v-for="(warning, index) in warnings"
        :key="`warning-${index}`"
        class="flex items-center gap-2 rounded-sm bg-warning-soft text-warning-ink px-2 py-1 text-sm"
      >
        <span class="i-mdi-alert-outline" />
        {{ warningSentence(warning) }}
      </li>
    </ul>
  </div>
</template>
