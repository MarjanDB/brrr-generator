<script setup lang="ts">
import { type ReportProvenance, SlovenianReportTypeId } from "@brrr/lib";
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from "reka-ui";
import { computed, onMounted, onUnmounted, ref } from "vue";
import AppBadge from "~/components/ui/AppBadge.vue";
import AppButton from "~/components/ui/AppButton.vue";
import AppTooltip from "~/components/ui/AppTooltip.vue";
import type { PanelSections } from "~/download/panel/PanelSections";
import { warningItemsOf } from "~/download/panel/warningItems";
import { dropSentence } from "~/download/sentences/dropSentence";
import { warningSentence } from "~/download/sentences/warningSentence";
import type { GeneratedOutputs } from "~/types/generatedOutputs";
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
	openGuide: [];
}>();

const { t } = useI18n();
const { translate, format } = useSentences();

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

      <PopoverRoot v-if="reading.totals.needsALook > 0">
        <PopoverTrigger as-child>
          <button type="button" :aria-label="t('download_count_needs_look')">
            <AppBadge :color="ColorIntent.WARNING" class="gap-1 cursor-pointer">
              <span class="i-mdi-eye-outline" />
              {{ reading.totals.needsALook }}
            </AppBadge>
          </button>
        </PopoverTrigger>
        <PopoverPortal>
          <PopoverContent
            side="bottom"
            align="start"
            :side-offset="6"
            class="z-50 w-96 max-w-[90vw] rounded-md border border-edge-strong bg-surface p-3 shadow-md"
          >
            <p class="text-label mb-2">{{ t('download_needs_look_title') }}</p>
            <ul class="flex flex-col gap-1.5">
              <li
                v-for="(item, index) in reading.needsALook"
                :key="index"
                class="rounded-sm bg-warning-soft text-warning-ink px-2 py-1 text-sm"
              >
                <span class="mr-1.5 rounded-sm bg-surface px-1 font-mono text-xs text-ink-muted">{{ item.subject.label }}</span>
                {{ dropSentence(item.drop, translate, format) }}
              </li>
            </ul>
          </PopoverContent>
        </PopoverPortal>
      </PopoverRoot>
      <AppTooltip v-else :content="t('download_count_needs_look')">
        <AppBadge :color="ColorIntent.WARNING" class="gap-1 opacity-50">
          <span class="i-mdi-eye-outline" />
          {{ reading.totals.needsALook }}
        </AppBadge>
      </AppTooltip>

      <PopoverRoot v-if="warningItems.length > 0">
        <PopoverTrigger as-child>
          <button type="button" :aria-label="t('download_count_warnings')">
            <AppBadge :color="ColorIntent.WARNING" class="gap-1 cursor-pointer">
              <span class="i-mdi-alert-outline" />
              {{ reading.totals.warnings }}
            </AppBadge>
          </button>
        </PopoverTrigger>
        <PopoverPortal>
          <PopoverContent
            side="bottom"
            align="start"
            :side-offset="6"
            class="z-50 w-96 max-w-[90vw] rounded-md border border-edge-strong bg-surface p-3 shadow-md"
          >
            <p class="text-label mb-2">{{ t('download_warnings_title') }}</p>
            <ul class="flex flex-col gap-1.5">
              <li
                v-for="(item, index) in warningItems"
                :key="index"
                class="rounded-sm bg-warning-soft text-warning-ink px-2 py-1 text-sm"
              >
                <span class="mr-1.5 rounded-sm bg-surface px-1 font-mono text-xs text-ink-muted">{{ item.title }}</span>
                {{ warningSentence(item.warning, translate, format) }}
              </li>
            </ul>
          </PopoverContent>
        </PopoverPortal>
      </PopoverRoot>
      <AppTooltip v-else :content="t('download_count_warnings')">
        <AppBadge :color="ColorIntent.WARNING" class="gap-1 opacity-50">
          <span class="i-mdi-alert-outline" />
          {{ reading.totals.warnings }}
        </AppBadge>
      </AppTooltip>
    </div>

    <span class="flex-1" />

    <AppButton v-if="guide" class="button-filled-action" @click="emit('openGuide')">
      {{ t('tax_authority_guide_button') }}
    </AppButton>
    <a v-if="csvUrl" :href="csvUrl" :download="outputs.csvFilename" class="button-filled-accent">
      {{ t('download_csv_label') }}
    </a>
    <a v-if="xmlUrl" :href="xmlUrl" :download="outputs.xmlFilename" class="button-filled-accent">
      {{ t('download_xml_label') }}
    </a>
    <AppButton class="button-filled-neutral" @click="emit('restart')">
      {{ t('restart_button') }}
    </AppButton>
  </div>
</template>
