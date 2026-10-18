<script setup lang="ts">
import { type ImportResult, TaxAuthorityId } from "@brrr/lib";
import type { Component } from "vue";
import SloveniaExportForm from "~/components/configure/SloveniaExportForm.vue";
import { TAX_AUTHORITY_CARDS, type TaxAuthorityCard } from "~/components/configure/taxAuthorityCards";
import type { GeneratedOutputs } from "~/components/download/generatedOutputs";

defineProps<{
  imported: ImportResult;
  collapsed: boolean;
}>();

const emit = defineEmits<{
  generated: [outputs: GeneratedOutputs];
}>();

const { t } = useI18n();

const authorityForms: Record<TaxAuthorityId, Component> = {
  [TaxAuthorityId.SLOVENIA]: SloveniaExportForm,
};

const selectedAuthorityId = ref<TaxAuthorityId | null>(
  TAX_AUTHORITY_CARDS.length === 1 ? (TAX_AUTHORITY_CARDS[0]?.authorityId ?? null) : null,
);

const selectedCard = computed<TaxAuthorityCard | undefined>(
  () => TAX_AUTHORITY_CARDS.find((c) => c.authorityId === selectedAuthorityId.value),
);

const activeForm = computed<Component | undefined>(
  () => (selectedAuthorityId.value === null ? undefined : authorityForms[selectedAuthorityId.value]),
);

// Tracks last generated summary for collapsed view
const lastXmlFilename = ref("");

function onSelect(authorityId: TaxAuthorityId) {
  if (authorityId !== selectedAuthorityId.value) {
    selectedAuthorityId.value = authorityId;
  }
}

function onGenerated(outputs: GeneratedOutputs) {
  lastXmlFilename.value = outputs.xmlFilename;
  emit("generated", outputs);
}
</script>

<template>
  <div v-if="collapsed" class="card p-3 flex items-center gap-3">
    <span class="i-mdi-check-circle text-icon-confirm text-lg shrink-0" />
    <div class="flex flex-col min-w-0">
      <span class="text-h5">{{ t('report_settings_title') }}</span>
      <span v-if="lastXmlFilename" class="text-body-sm app-text-muted">
        {{ lastXmlFilename }}
        <template v-if="selectedCard"> · {{ selectedCard.name }}</template>
      </span>
    </div>
  </div>

  <div v-else class="flex flex-col gap-4 w-full max-w-screen-md mx-auto">
    <!-- Tax authority selector -->
    <div class="card card-padding-md flex flex-col gap-3">
      <h2 class="text-h5">{{ t('tax_authority_label') }}</h2>
      <p class="text-body-sm app-text-muted">{{ t('tax_authority_description') }}</p>
      <div
        class="grid gap-3"
        :class="TAX_AUTHORITY_CARDS.length === 1 ? 'grid-cols-1 max-w-xs' : 'grid-cols-2 sm:grid-cols-3'"
      >
        <TaxAuthorityCard
          v-for="card in TAX_AUTHORITY_CARDS"
          :key="card.authorityId"
          :card="card"
          :selected="card.authorityId === selectedAuthorityId"
          @select="onSelect"
        />
      </div>
    </div>

    <!-- Authority-specific form -->
    <component
      :is="activeForm"
      v-if="activeForm"
      :key="selectedAuthorityId"
      :imported="imported"
      @generated="onGenerated"
    />
  </div>
</template>
