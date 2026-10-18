<script setup lang="ts">
import type { ImportResult } from "@brrr/lib";
import type { GeneratedOutputs } from "~/components/download/generatedOutputs";

const { locale, setLocale, locales, t } = useI18n();

useSeoMeta({
  title: () => t("app_title"),
  description: () => t("site_description"),
  ogTitle: () => t("app_title"),
  ogDescription: () => t("site_description"),
});

const localeOptions = computed(() =>
  locales.value.map((l) => ({
    value: l.code,
    label: l.code === "en" ? "🇬🇧 English" : "🇸🇮 Slovenščina",
  })),
);
const currentLocale = computed({
  get: () => locale.value,
  set: (val) => setLocale(val as "en" | "sl"),
});

// Wizard state
const currentStep = ref<1 | 2 | 3 | 4>(1);
const xmlFiles = ref<FileList | null>(null);
const imported = shallowRef<ImportResult | null>(null);
const generatedOutputs = shallowRef<GeneratedOutputs | null>(null);
// Tracks whether the user has confirmed step 2 (unlocks step 3 component)
const step3Unlocked = ref(false);

// Highest step whose prerequisites are met — drives stepper navigability
const maxStep = computed<1 | 2 | 3 | 4>(() => {
  if (generatedOutputs.value !== null) return 4;
  if (step3Unlocked.value && imported.value !== null) return 3;
  if (imported.value !== null) return 2;
  return 1;
});

const stepLabels = computed(() => [
  t("wizard_step_upload"),
  t("wizard_step_review"),
  t("wizard_step_configure"),
  t("wizard_step_download"),
]);

function onProcessed(result: ImportResult, files: FileList) {
  imported.value = result;
  xmlFiles.value = files;
  generatedOutputs.value = null;
  step3Unlocked.value = false;
  currentStep.value = 2;
}

function onConfirmed() {
  step3Unlocked.value = true;
  currentStep.value = 3;
}

function onGenerated(outputs: GeneratedOutputs) {
  generatedOutputs.value = outputs;
  currentStep.value = 4;
}

function onNavigate(step: number) {
  currentStep.value = step as 1 | 2 | 3 | 4;
}

function onRestart() {
  currentStep.value = 1;
  xmlFiles.value = null;
  imported.value = null;
  generatedOutputs.value = null;
  step3Unlocked.value = false;
}
</script>

<template>
  <div class="py-8 flex flex-col gap-6">
    <!-- Page header -->
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div class="flex items-center justify-between gap-3">
        <h1 class="text-h1">{{ t('app_title') }}</h1>
        <!-- biome-ignore lint/a11y/useAnchorContent: icon-only link, named by its aria-label -->
        <a
          href="https://github.com/MarjanDB/brrr-generator"
          target="_blank"
          rel="noopener"
          aria-label="GitHub repository"
          class="i-mdi-github text-2xl app-text-muted hover:app-text transition-colors"
        />
      </div>
      <div class="flex items-center gap-2">
        <AppSelect v-model="currentLocale" :options="localeOptions" />
      </div>
    </div>

    <!-- Stepper indicator -->
    <WizardStepper :steps="stepLabels" :current-step="currentStep" :max-step="maxStep" @navigate="onNavigate" />

    <!-- Step 1: Upload (always visible; collapses after completion) -->
    <UploadStep
      :collapsed="currentStep > 1"
      :file-count="xmlFiles?.length ?? 0"
      @processed="onProcessed"
    />

    <!-- Step 2: Review (mounted only after parsing completes) -->
    <ReviewStep
      v-if="imported !== null"
      :financial-events="imported.events"
      :collapsed="currentStep > 2"
      @confirmed="onConfirmed"
    />

    <!-- Step 3: Configure (mounted once review is confirmed; stays mounted during back-navigation) -->
    <ConfigureStep
      v-if="imported !== null && step3Unlocked"
      :imported="imported"
      :collapsed="currentStep > 3"
      @generated="onGenerated"
    />

    <!-- Step 4: Download (mounted only after generation completes) -->
    <LazyDownloadStep
      v-if="generatedOutputs !== null && currentStep === 4"
      :outputs="generatedOutputs"
      @restart="onRestart"
    />
  </div>
</template>
