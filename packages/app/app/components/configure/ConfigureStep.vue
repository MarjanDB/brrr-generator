<script setup lang="ts">
import type { TaxAuthorityId } from "@brrr/lib";
import { type AcceptableValue, RadioGroupRoot } from "reka-ui";

const props = defineProps<{
  // The authority chosen before, when the step is shown again.
  chosen: TaxAuthorityId | null;
}>();

const emit = defineEmits<{
  chosen: [authorityId: TaxAuthorityId];
}>();

const { t } = useI18n();

const selectedAuthorityId = ref<TaxAuthorityId | null>(
  props.chosen ??
    (TAX_AUTHORITY_CARDS.length === 1 ? (TAX_AUTHORITY_CARDS[0]?.authorityId ?? null) : null),
);

const headingId = useId();

// The radio group hands back the chosen card's value; the card itself carries the typed id.
function onSelect(value: AcceptableValue) {
  const card = TAX_AUTHORITY_CARDS.find((candidate) => candidate.authorityId === value);
  if (card !== undefined && card.authorityId !== selectedAuthorityId.value) {
    selectedAuthorityId.value = card.authorityId;
  }
}

function onContinue() {
  if (selectedAuthorityId.value !== null) {
    emit("chosen", selectedAuthorityId.value);
  }
}
</script>

<template>
  <!-- All a report needs is the tax authority; the year and the forms are picked on the next step. -->
  <div class="card card-padding-md flex flex-col gap-3 w-full max-w-screen-md mx-auto">
    <h2 :id="headingId" class="text-h5">{{ t('tax_authority_label') }}</h2>
    <p class="text-body-sm app-text-muted">{{ t('tax_authority_description') }}</p>
    <RadioGroupRoot
      :model-value="selectedAuthorityId ?? undefined"
      :aria-labelledby="headingId"
      class="grid gap-3"
      :class="TAX_AUTHORITY_CARDS.length === 1 ? 'grid-cols-1 max-w-xs' : 'grid-cols-2 sm:grid-cols-3'"
      @update:model-value="onSelect"
    >
      <TaxAuthorityCard
        v-for="card in TAX_AUTHORITY_CARDS"
        :key="card.authorityId"
        :card="card"
      />
    </RadioGroupRoot>
    <AppButton class="self-start" :disabled="selectedAuthorityId === null" @click="onContinue">
      {{ t('tax_authority_continue') }}
    </AppButton>
  </div>
</template>
