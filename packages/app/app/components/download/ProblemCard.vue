<script setup lang="ts">
import {
	type CompanyDefinition,
	ProvenanceEventKind,
	ProvenanceField,
	type ProvenanceNode,
} from "@brrr/lib";
import { computed, ref, watch } from "vue";
import PayerForm from "~/components/download/PayerForm.vue";
import { ProblemState } from "~/types/reportProblems";
import { ButtonVariant, ColorIntent, ControlSize } from "~/types/ui";

// The selected problem of the Problems tab: what went wrong, what on the form it affects (each item
// a way to it on the form), and its fix where the site has one. A payer the lookup couldn't find is
// defined here, for the session; the reports are made again with it, and the problem shows the
// payer, to edit or remove.
const { t } = useI18n();
const { labelOf: countryLabelOf } = useCountries();
const { dropSentence, nodeDate, nodeAmount } = useProvenanceText();
const { selected, selectedLeftOut, titleOf, sentenceOf, showOnForm, definesPayer } =
	useReportProblems();
const { definePayer, removePayer } = useReportFlow();

const editing = ref(false);
watch(
	() => selected.value?.key,
	() => {
		editing.value = false;
	},
);

const open = computed(() => selected.value?.state === ProblemState.OPEN);
const fixable = computed(() => selected.value !== null && definesPayer(selected.value.kind));
const defined = computed(() => selected.value?.defined?.definition ?? null);

// What an affected item is: a dividend, a tax, a trade.
function whatOf(node: ProvenanceNode): string {
	const kind = Object.values(ProvenanceEventKind).find(
		(candidate) => candidate === fieldOf(node, ProvenanceField.EVENT_KIND),
	);
	return kind === undefined ? "" : t(eventKindKeys[kind]);
}

function save(definition: CompanyDefinition) {
	const problem = selected.value;
	if (problem === null) {
		return;
	}
	definePayer({ definition, resolves: problem.kind });
	editing.value = false;
}
</script>

<template>
  <div class="flex flex-col gap-4 min-w-0 rounded-md border border-edge p-4">
    <template v-if="selected !== null">
      <div class="flex items-start gap-3 flex-wrap">
        <span
          :class="open ? 'i-mdi-alert-outline text-warning-ink' : 'i-mdi-check-circle-outline text-success-ink'"
          class="size-6 shrink-0"
          aria-hidden="true"
        />
        <div class="min-w-0 flex-1">
          <h3 class="text-heading leading-tight">{{ titleOf(selected) }}</h3>
          <p class="text-meta">{{ selected.title }}</p>
        </div>
        <AppBadge pill :color="open ? ColorIntent.WARNING : ColorIntent.SUCCESS">
          {{ open ? t('problems_open') : t('problems_resolved') }}
        </AppBadge>
      </div>

      <p class="text-body">{{ sentenceOf(selected) }}</p>

      <section v-if="selected.affected.length > 0" class="flex flex-col gap-1.5">
        <h4 class="text-subheading">{{ t('problems_affects') }}</h4>
        <ul class="flex flex-col rounded-sm border border-edge">
          <li
            v-for="node in selected.affected"
            :key="node.id"
            class="flex flex-wrap items-center gap-x-3 px-3 py-1 text-body tabular-nums border-t border-edge-subtle first:border-t-0"
          >
            <span class="whitespace-nowrap">{{ nodeDate(node) }}</span>
            <span class="flex-1 min-w-24 truncate">{{ whatOf(node) }}</span>
            <span class="whitespace-nowrap">{{ nodeAmount(node) }}</span>
            <AppButton
              :variant="ButtonVariant.QUIET"
              :size="ControlSize.SM"
              class="ml-auto"
              @click="showOnForm(selected, node)"
            >
              {{ t('problems_show_on_form') }}
            </AppButton>
          </li>
        </ul>
      </section>

      <template v-if="fixable && selected.entry.isin !== null">
        <section v-if="defined !== null && !editing" class="flex flex-col gap-1.5">
          <h4 class="text-subheading">{{ t('problems_defined_by_you') }}</h4>
          <div class="flex items-center gap-3 flex-wrap rounded-sm border border-success-edge bg-success-soft px-3 py-2">
            <span class="i-mdi-domain size-5 shrink-0 text-success-ink" aria-hidden="true" />
            <div class="min-w-48 flex-1">
              <p class="text-label">{{ defined.name }}</p>
              <p class="text-meta">
                {{ defined.street }}, {{ defined.city }}, {{ countryLabelOf(defined.countryCode) }}
              </p>
            </div>
            <AppButton :variant="ButtonVariant.SECONDARY" :size="ControlSize.SM" @click="editing = true">
              {{ t('problems_payer_edit') }}
            </AppButton>
            <AppButton
              :variant="ButtonVariant.QUIET"
              :size="ControlSize.SM"
              @click="removePayer(defined.isin)"
            >
              {{ t('problems_payer_remove') }}
            </AppButton>
          </div>
        </section>
        <section v-else class="flex flex-col gap-1.5">
          <h4 class="text-subheading">
            {{ defined === null ? t('problems_define_payer') : t('problems_edit_payer') }}
          </h4>
          <p class="text-meta">{{ t('problems_define_payer_hint') }}</p>
          <PayerForm
            :key="selected.key"
            :isin="selected.entry.isin"
            :initial="defined"
            @save="save"
            @cancel="editing = false"
          />
        </section>
      </template>
    </template>

    <template v-else-if="selectedLeftOut !== null">
      <div class="flex items-start gap-3">
        <span class="i-mdi-alert-circle-outline size-6 shrink-0 text-danger-ink" aria-hidden="true" />
        <h3 class="text-heading leading-tight flex-1">{{ dropSentence(selectedLeftOut.drop) }}</h3>
      </div>
      <section class="flex flex-col gap-1.5">
        <h4 class="text-subheading">{{ t('problems_affects') }}</h4>
        <ul class="flex flex-col rounded-sm border border-edge">
          <li
            v-for="(item, index) in selectedLeftOut.items"
            :key="index"
            class="px-3 py-1 text-body border-t border-edge-subtle first:border-t-0"
          >
            {{ item.subject.label }}
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
