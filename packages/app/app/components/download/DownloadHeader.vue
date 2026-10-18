<script setup lang="ts">
import { type ReportProvenance, SlovenianReportTypeId } from "@brrr/lib";
import { computed, onMounted, onUnmounted, ref } from "vue";
import GuideModal from "~/components/guide/GuideModal.vue";
import AppBadge from "~/components/ui/AppBadge.vue";
import AppButton from "~/components/ui/AppButton.vue";
import AppPopover from "~/components/ui/AppPopover.vue";
import AppTooltip from "~/components/ui/AppTooltip.vue";
import type { GeneratedOutputs } from "~/types/generatedOutputs";
import type { PanelSections } from "~/types/instrumentPanel";
import { ColorIntent } from "~/types/ui";
import type { TaxAuthorityGuide } from "~/utils/taxAuthorityGuides";

const props = defineProps<{
	outputs: GeneratedOutputs;
	reading: ReportProvenance;
	sections: PanelSections;
	guide: TaxAuthorityGuide | undefined;
}>();

const emit = defineEmits<{
	restart: [];
}>();

const { t } = useI18n();
const { dropSentence, warningSentence } = useProvenanceText();

const warningItems = computed(() => warningItemsOf(props.sections));

const xmlUrl = ref<string | null>(null);
const csvUrl = ref<string | null>(null);

const formKeys: Record<SlovenianReportTypeId, string> = {
	[SlovenianReportTypeId.KDVP]: "report_type_kdvp",
	[SlovenianReportTypeId.DIV]: "report_type_div",
	[SlovenianReportTypeId.IFI]: "report_type_ifi",
};

const heading = computed(() => {
	const reportType = Object.values(SlovenianReportTypeId).find(
		(candidate) => candidate === props.outputs.reportTypeId,
	);
	return t("download_heading", {
		form: reportType === undefined ? props.outputs.reportTypeId : t(formKeys[reportType]),
		year: props.outputs.year,
	});
});

function revokeUrls() {
	if (xmlUrl.value) URL.revokeObjectURL(xmlUrl.value);
	if (csvUrl.value) URL.revokeObjectURL(csvUrl.value);
	xmlUrl.value = null;
	csvUrl.value = null;
}

onMounted(() => {
	xmlUrl.value = URL.createObjectURL(new Blob([props.outputs.xml], { type: "application/xml" }));
	csvUrl.value = URL.createObjectURL(new Blob([props.outputs.csv], { type: "text/csv" }));
});

onUnmounted(revokeUrls);
</script>

<template>
  <div class="flex items-center gap-3 flex-wrap">
    <h2 class="text-h5">{{ heading }}</h2>

    <div class="flex items-center gap-2 flex-wrap">
      <AppTooltip :content="t('download_count_lines')">
        <AppBadge :color="ColorIntent.SUCCESS" class="gap-1">
          <span class="i-mdi-file-document-outline" />
          {{ reading.totals.lines }}
        </AppBadge>
      </AppTooltip>
      <AppTooltip :content="t('download_count_not_in_report')">
        <AppBadge :color="ColorIntent.NEUTRAL" class="gap-1">
          <span class="i-mdi-minus-circle-outline" />
          {{ reading.totals.notInReport }}
        </AppBadge>
      </AppTooltip>

      <AppPopover v-if="reading.totals.needsALook > 0" :tooltip="t('download_count_needs_look')" class="w-96">
        <template #trigger>
          <button type="button" class="rounded-sm app-focus-ring" :aria-label="t('download_count_needs_look')">
            <AppBadge :color="ColorIntent.WARNING" class="gap-1 cursor-pointer">
              <span class="i-mdi-eye-outline" />
              {{ reading.totals.needsALook }}
            </AppBadge>
          </button>
        </template>
        <p class="text-label mb-2">{{ t('download_needs_look_title') }}</p>
        <ul class="flex flex-col gap-1.5">
          <AppCallout v-for="(item, index) in reading.needsALook" :key="index" as="li" :color="ColorIntent.WARNING">
            <span class="mr-1.5 rounded-sm bg-surface px-1 font-mono text-xs text-ink-muted">{{ item.subject.label }}</span>
            {{ dropSentence(item.drop) }}
          </AppCallout>
        </ul>
      </AppPopover>
      <AppTooltip v-else :content="t('download_count_needs_look')">
        <AppBadge :color="ColorIntent.WARNING" class="gap-1 opacity-50">
          <span class="i-mdi-eye-outline" />
          {{ reading.totals.needsALook }}
        </AppBadge>
      </AppTooltip>

      <AppPopover v-if="warningItems.length > 0" :tooltip="t('download_count_warnings')" class="w-96">
        <template #trigger>
          <button type="button" class="rounded-sm app-focus-ring" :aria-label="t('download_count_warnings')">
            <AppBadge :color="ColorIntent.WARNING" class="gap-1 cursor-pointer">
              <span class="i-mdi-alert-outline" />
              {{ reading.totals.warnings }}
            </AppBadge>
          </button>
        </template>
        <p class="text-label mb-2">{{ t('download_warnings_title') }}</p>
        <ul class="flex flex-col gap-1.5">
          <AppCallout v-for="(item, index) in warningItems" :key="index" as="li" :color="ColorIntent.WARNING">
            <span class="mr-1.5 rounded-sm bg-surface px-1 font-mono text-xs text-ink-muted">{{ item.title }}</span>
            {{ warningSentence(item.warning) }}
          </AppCallout>
        </ul>
      </AppPopover>
      <AppTooltip v-else :content="t('download_count_warnings')">
        <AppBadge :color="ColorIntent.WARNING" class="gap-1 opacity-50">
          <span class="i-mdi-alert-outline" />
          {{ reading.totals.warnings }}
        </AppBadge>
      </AppTooltip>
    </div>

    <span class="flex-1" />

    <GuideModal v-if="guide" :name-key="guide.nameKey" :steps="guide.steps">
      <template #trigger>
        <AppButton>
          {{ t('tax_authority_guide_button') }}
        </AppButton>
      </template>
    </GuideModal>
    <a v-if="csvUrl" :href="csvUrl" :download="outputs.csvFilename" class="button-filled-accent">
      {{ t('download_csv_label') }}
    </a>
    <a v-if="xmlUrl" :href="xmlUrl" :download="outputs.xmlFilename" class="button-filled-accent">
      {{ t('download_xml_label') }}
    </a>
    <AppButton :color="ColorIntent.NEUTRAL" @click="emit('restart')">
      {{ t('restart_button') }}
    </AppButton>
  </div>
</template>
