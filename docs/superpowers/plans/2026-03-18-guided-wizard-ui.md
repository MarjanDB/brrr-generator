# Guided Wizard UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `app/app/pages/index.vue` from a 240-line monolithic form into a 4-step progressive-disclosure wizard with domain-foldered Vue components.

**Architecture:** `index.vue` becomes a thin orchestrator (step state + inter-step data). Each step lives in a domain-foldered component (`ibkr/` or `export/`). All four steps are always rendered; active step is expanded, completed steps show a collapsed summary card. State flows down as props, actions flow up as emits — no shared store needed.

**Tech Stack:** Nuxt 4, Vue 3 Composition API (`<script setup lang="ts">`), UNO CSS shortcuts (`card`, `card-padding-md`, `button-filled-primary`), `@nuxtjs/i18n`, `@brrr/lib`

---

## Known Pitfalls (Read First)

1. **`FinancialEvents` and `TradeEventCashTransactionDividend` are not exported from `@brrr/lib`** — Task 0 adds them. Build the lib before working on any frontend component.
2. **`card-padding-sm` doesn't exist** — use `p-3` inline on collapsed summary cards.
3. **`dg.items` does not exist** — the spec has a bug. Use `dg.derivativeTrades.length` for derivative count in `IbkrReviewStep`.
4. **`FinancialIdentifier` methods** — use `getIsin()`, `getTicker()`, `getName()` (not direct property access — they are private `_isin`, `_ticker`, `_name`).
5. **`v-if` vs "always mounted"** — The spec says "all four steps are always mounted." This plan intentionally deviates: Steps 2, 3, and 4 use `v-if` so they only mount when their required prop data exists. This avoids TypeScript prop violations and is simpler than adding "not-yet-ready" placeholder states. Functionally equivalent: completed steps still render collapsed summary cards and the user experience is identical.

---

## File Map

**New files:**

| Path | Purpose |
|---|---|
| `app/app/components/ibkr/IbkrUploadStep.vue` | Step 1 — file upload + IBKR parsing |
| `app/app/components/ibkr/IbkrReviewStep.vue` | Step 2 — instrument table |
| `app/app/components/export/ExportConfigStep.vue` | Step 3 — report config + generation |
| `app/app/components/export/ExportDownloadStep.vue` | Step 4 — download + restart |
| `app/app/components/ui/WizardStepper.vue` | Shared stepper indicator |

**Modified files:**

| Path | Change |
|---|---|
| `lib/src/index.ts` | Add 2 missing exports |
| `app/app/pages/index.vue` | Replace monolith with thin orchestrator |
| `app/i18n/locales/en.json` | Add 18 new keys |
| `app/i18n/locales/sl.json` | Add 18 new keys (Slovenian) |

---

## Task 0 — Export Missing Lib Types

**Files:**
- Modify: `lib/src/index.ts`

- [ ] **Step 1: Add the two missing exports to `lib/src/index.ts`**

After line 9 (after `IdentifierChangeType` export), add:

```typescript
export { FinancialEvents } from "@brrr/Core/Schemas/FinancialEvents.js";
export { TradeEventCashTransactionDividend } from "@brrr/Core/Schemas/Events.js";
```

- [ ] **Step 2: Build and typecheck the lib**

```bash
cd /mnt/extra/Projects/IB-tax-calculator
pnpm --filter lib build
pnpm --filter lib typecheck
```

Expected: both commands exit with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add lib/src/index.ts
git commit -m "chore(lib): export FinancialEvents and TradeEventCashTransactionDividend"
```

---

## Task 1 — Add i18n Keys

**Files:**
- Modify: `app/i18n/locales/en.json`
- Modify: `app/i18n/locales/sl.json`

- [ ] **Step 1: Add 18 keys to `en.json`**

Append before the closing `}`:

```json
  "wizard_step_upload": "Upload Files",
  "wizard_step_review": "Review Data",
  "wizard_step_configure": "Configure Export",
  "wizard_step_download": "Download",
  "review_instruments_title": "Instruments Found",
  "review_column_name": "Name / Ticker",
  "review_column_isin": "ISIN",
  "review_column_stock_trades": "Stock Trades",
  "review_column_dividends": "Dividends",
  "review_column_derivatives": "Derivatives",
  "review_confirm_button": "Looks good, continue",
  "review_summary": "{n} instrument(s) found",
  "upload_summary": "{n} file(s) loaded",
  "upload_button": "Process Files",
  "export_summary": "{type} / {year}",
  "restart_button": "Start Over",
  "download_xml_label": "Download XML (eDavki)",
  "download_csv_label": "Download CSV"
```

Note: `review_summary`, `upload_summary`, `export_summary` use named interpolation — call as `t('review_summary', { n: count })`.

- [ ] **Step 2: Add 18 keys to `sl.json`**

Append before the closing `}`:

```json
  "wizard_step_upload": "Naloži datoteke",
  "wizard_step_review": "Pregled podatkov",
  "wizard_step_configure": "Nastavi izvoz",
  "wizard_step_download": "Prenesi",
  "review_instruments_title": "Instrumenti",
  "review_column_name": "Ime / Ticker",
  "review_column_isin": "ISIN",
  "review_column_stock_trades": "Trgov. z delnicami",
  "review_column_dividends": "Dividende",
  "review_column_derivatives": "Izvedeni fin. instr.",
  "review_confirm_button": "Izgleda dobro, nadaljuj",
  "review_summary": "{n} instrument(ov) najdenih",
  "upload_summary": "{n} datoteka(e) naložena(e)",
  "upload_button": "Obdelaj datoteke",
  "export_summary": "{type} / {year}",
  "restart_button": "Začni znova",
  "download_xml_label": "Prenesi XML (eDavki)",
  "download_csv_label": "Prenesi CSV"
```

- [ ] **Step 3: Commit**

```bash
git add app/i18n/locales/en.json app/i18n/locales/sl.json
git commit -m "feat(i18n): add wizard UI translation keys (en + sl)"
```

---

## Task 2 — WizardStepper Component

**Files:**
- Create: `app/app/components/ui/WizardStepper.vue`

- [ ] **Step 1: Create `WizardStepper.vue`**

```vue
<script setup lang="ts">
defineProps<{
  steps: string[];
  currentStep: number; // 1-based
}>();
</script>

<template>
  <nav aria-label="Wizard steps" class="flex items-center gap-0">
    <template v-for="(label, index) in steps" :key="index">
      <div class="flex flex-col items-center gap-1 min-w-0 flex-shrink-0">
        <div
          class="size-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors"
          :class="
            index + 1 < currentStep
              ? 'bg-secondary-500 text-secondary-10'
              : index + 1 === currentStep
                ? 'bg-secondary-300 dark:bg-secondary-700 text-secondary-990 dark:text-secondary-10'
                : 'bg-stale-200 dark:bg-stale-800 text-stale-500'
          "
        >
          <span v-if="index + 1 < currentStep" class="i-mdi-check text-base" />
          <span v-else>{{ index + 1 }}</span>
        </div>
        <span
          class="text-xs text-center leading-tight"
          :class="index + 1 === currentStep ? 'app-text font-medium' : 'app-text-muted'"
        >
          {{ label }}
        </span>
      </div>
      <div
        v-if="index < steps.length - 1"
        class="flex-1 h-px mt-[-1rem]"
        :class="index + 1 < currentStep ? 'bg-secondary-500' : 'bg-stale-250 dark:bg-stale-750'"
      />
    </template>
  </nav>
</template>
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter app typecheck
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/app/components/ui/WizardStepper.vue
git commit -m "feat(ui): add WizardStepper component"
```

---

## Task 3 — IbkrUploadStep

**Files:**
- Create: `app/app/components/ibkr/IbkrUploadStep.vue`

- [ ] **Step 1: Create `IbkrUploadStep.vue`**

This step owns all IBKR parsing logic. It emits the parsed `FinancialEvents` upward.

```vue
<script setup lang="ts">
import {
  createContainer,
  FinancialEvents,
  IbkrBrokerageExportProvider,
  StagingFinancialGroupingProcessor,
} from "@brrr/lib";
import { ApiInfoProvider } from "~/utils/ApiInfoProvider";

const props = defineProps<{
  collapsed: boolean;
  fileCount: number;
}>();

const emit = defineEmits<{
  processed: [financialEvents: FinancialEvents, files: FileList];
}>();

const { t } = useI18n();

const xmlFiles = ref<FileList | null>(null);
const error = ref<string | null>(null);
const loading = ref(false);

const validateFiles = (v: FileList | null) =>
  v && v.length > 0 ? null : t("validation_select_files");

async function onSubmit(valid: boolean) {
  if (!valid) return;
  error.value = null;
  loading.value = true;
  try {
    const xmlContents = await Promise.all(
      Array.from(xmlFiles.value!).map((f) => f.text()),
    );
    const container = createContainer(new ApiInfoProvider());
    const stagingEvents = container
      .get(IbkrBrokerageExportProvider)
      .loadAndTransform(xmlContents);
    const financialEvents = container
      .get(StagingFinancialGroupingProcessor)
      .processStagingFinancialEvents(stagingEvents);
    emit("processed", financialEvents, xmlFiles.value!);
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div v-if="collapsed" class="card p-3 flex items-center gap-3">
    <span class="i-mdi-check-circle text-secondary-600 dark:text-secondary-400 text-lg shrink-0" />
    <div class="flex flex-col min-w-0">
      <span class="text-h5">{{ t('ibkr_export_title') }}</span>
      <span class="text-body-sm app-text-muted">{{ t('upload_summary', { n: fileCount }) }}</span>
    </div>
  </div>

  <div v-else class="card card-padding-md flex flex-col gap-3">
    <h2 class="text-h5">{{ t('ibkr_export_title') }}</h2>
    <p class="text-body-sm app-text-muted">{{ t('ibkr_export_hint') }}</p>
    <AppForm @submit="onSubmit">
      <div class="flex flex-col gap-4">
        <AppFileInput
          v-model="xmlFiles"
          :label="t('xml_files_label')"
          accept=".xml"
          multiple
          :validate="validateFiles"
        />
        <div v-if="error" class="alert-error">{{ error }}</div>
        <AppButton class="button-filled-primary self-start" type="submit" :loading="loading">
          {{ t('upload_button') }}
        </AppButton>
      </div>
    </AppForm>
  </div>
</template>
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter app typecheck
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/app/components/ibkr/IbkrUploadStep.vue
git commit -m "feat(ibkr): add IbkrUploadStep wizard component"
```

---

## Task 4 — IbkrReviewStep

**Files:**
- Create: `app/app/components/ibkr/IbkrReviewStep.vue`

- [ ] **Step 1: Create `IbkrReviewStep.vue`**

**IMPORTANT:** Use `dg.derivativeTrades.length` for derivatives — the spec had a bug saying `dg.items`. Also use `instanceof TradeEventCashTransactionDividend` to filter dividends (requires value import, not `import type`).

```vue
<script setup lang="ts">
import { FinancialEvents, TradeEventCashTransactionDividend } from "@brrr/lib";

const props = defineProps<{
  financialEvents: FinancialEvents;
  collapsed: boolean;
}>();

const emit = defineEmits<{
  confirmed: [];
}>();

const { t } = useI18n();

interface InstrumentRow {
  name: string;
  isin: string;
  stockTrades: number;
  dividends: number;
  derivatives: number;
}

const rows = computed<InstrumentRow[]>(() =>
  props.financialEvents.groupings.map((g) => ({
    name: g.financialIdentifier.getTicker() ?? g.financialIdentifier.getName() ?? g.financialIdentifier.getIsin() ?? "—",
    isin: g.financialIdentifier.getIsin() ?? "—",
    stockTrades: g.stockTrades.length,
    dividends: g.cashTransactions.filter(
      (tx) => tx instanceof TradeEventCashTransactionDividend,
    ).length,
    derivatives: g.derivativeGroupings.reduce(
      (sum, dg) => sum + dg.derivativeTrades.length,
      0,
    ),
  })),
);

const groupingCount = computed(() => props.financialEvents.groupings.length);
</script>

<template>
  <div v-if="collapsed" class="card p-3 flex items-center gap-3">
    <span class="i-mdi-check-circle text-secondary-600 dark:text-secondary-400 text-lg shrink-0" />
    <div class="flex flex-col min-w-0">
      <span class="text-h5">{{ t('review_instruments_title') }}</span>
      <span class="text-body-sm app-text-muted">{{ t('review_summary', { n: groupingCount }) }}</span>
    </div>
  </div>

  <div v-else class="card card-padding-md flex flex-col gap-4">
    <h2 class="text-h5">{{ t('review_instruments_title') }}</h2>
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-stale-250 dark:border-stale-750">
            <th class="text-left py-2 pr-4 font-medium app-text">{{ t('review_column_name') }}</th>
            <th class="text-left py-2 pr-4 font-medium app-text">{{ t('review_column_isin') }}</th>
            <th class="text-right py-2 pr-4 font-medium app-text">{{ t('review_column_stock_trades') }}</th>
            <th class="text-right py-2 pr-4 font-medium app-text">{{ t('review_column_dividends') }}</th>
            <th class="text-right py-2 font-medium app-text">{{ t('review_column_derivatives') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, i) in rows"
            :key="i"
            class="border-b border-stale-200 dark:border-stale-800 last:border-0"
          >
            <td class="py-2 pr-4 app-text">{{ row.name }}</td>
            <td class="py-2 pr-4 app-text-muted font-mono text-xs">{{ row.isin }}</td>
            <td class="py-2 pr-4 text-right app-text">{{ row.stockTrades }}</td>
            <td class="py-2 pr-4 text-right app-text">{{ row.dividends }}</td>
            <td class="py-2 text-right app-text">{{ row.derivatives }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <AppButton class="button-filled-primary self-start" @click="emit('confirmed')">
      {{ t('review_confirm_button') }}
    </AppButton>
  </div>
</template>
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter app typecheck
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/app/components/ibkr/IbkrReviewStep.vue
git commit -m "feat(ibkr): add IbkrReviewStep wizard component"
```

---

## Task 5 — ExportConfigStep

**Files:**
- Create: `app/app/components/export/ExportConfigStep.vue`

- [ ] **Step 1: Create `ExportConfigStep.vue`**

This step owns all taxpayer form fields and report configuration. It replicates the "Report Settings" + "Tax Payer Info" cards from the original `index.vue`. The container is created fresh here (independent of the one in IbkrUploadStep).

```vue
<script setup lang="ts">
import {
  ApplyIdentifierRelationshipsService,
  createContainer,
  DivReportGenerator,
  FinancialEvents,
  IfiReportGenerator,
  KdvpReportGenerator,
  SlovenianTaxAuthorityProvider,
  SlovenianTaxAuthorityReportTypes,
  TaxAuthorityLotMatchingMethod,
  TaxPayerConfigSchema,
  zDateTimeFromISOString,
} from "@brrr/lib";
import { ApiInfoProvider } from "~/utils/ApiInfoProvider";

const props = defineProps<{
  financialEvents: FinancialEvents;
  collapsed: boolean;
}>();

const emit = defineEmits<{
  generated: [outputs: { xml: string; csv: string; reportType: string }];
}>();

const { t } = useI18n();

const year = ref<number | null>(new Date().getFullYear() - 1);
const reportType = ref("");
const taxNumber = ref("");
const fullName = ref("");
const address1 = ref("");
const city = ref("");
const postNumber = ref("");
const postName = ref("");
const countryId = ref("SI");
const countryName = ref("Slovenija");

// Captured after a successful generation; used in collapsed summary
const lastReportType = ref("");
const lastYear = ref<number | null>(null);

const error = ref<string | null>(null);
const loading = ref(false);

const REPORT_MAP: Record<string, SlovenianTaxAuthorityReportTypes> = {
  kdvp: SlovenianTaxAuthorityReportTypes.DOH_KDVP,
  div: SlovenianTaxAuthorityReportTypes.DOH_DIV,
  ifi: SlovenianTaxAuthorityReportTypes.D_IFI,
};

const reportTypeOptions = computed(() => [
  { value: "kdvp", label: t("report_type_kdvp") },
  { value: "div", label: t("report_type_div") },
  { value: "ifi", label: t("report_type_ifi") },
]);

const validateRequired = (v: string) => (v.trim() ? null : t("validation_required"));
const validateYear = (v: number | null) => {
  if (v === null) return t("validation_required");
  if (!Number.isInteger(v) || v < 2010 || v > 2100) return t("validation_year");
  return null;
};
const validateReportType = (v: string) => (v ? null : t("validation_select_report_type"));

async function onSubmit(valid: boolean) {
  if (!valid) return;
  error.value = null;
  loading.value = true;
  try {
    const taxPayerInfo = TaxPayerConfigSchema.parse({
      taxNumber: taxNumber.value,
      taxpayerType: "FO",
      name: fullName.value,
      address1: address1.value,
      address2: null,
      city: city.value,
      postNumber: postNumber.value,
      postName: postName.value,
      municipalityName: "",
      birthDate: "1990-01-01",
      maticnaStevilka: "",
      invalidskoPodjetje: false,
      resident: true,
      activityCode: "",
      activityName: "",
      countryId: countryId.value,
      countryName: countryName.value,
    });

    const reportConfig = {
      fromDate: zDateTimeFromISOString.parse(`${year.value}-01-01`),
      toDate: zDateTimeFromISOString.parse(`${year.value! + 1}-01-01`),
      lotMatchingMethod: TaxAuthorityLotMatchingMethod.FIFO,
    };

    const container = createContainer(new ApiInfoProvider());
    const provider = new SlovenianTaxAuthorityProvider(
      taxPayerInfo,
      reportConfig,
      container.get(ApplyIdentifierRelationshipsService),
      container.get(KdvpReportGenerator),
      container.get(DivReportGenerator),
      container.get(IfiReportGenerator),
    );

    const selectedType = REPORT_MAP[reportType.value];
    const [xml, csv] = await Promise.all([
      provider.generateExportForTaxAuthority(selectedType, props.financialEvents),
      provider.generateSpreadsheetExport(selectedType, props.financialEvents),
    ]);

    lastReportType.value = reportType.value;
    lastYear.value = year.value;

    emit("generated", { xml, csv, reportType: reportType.value });
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div v-if="collapsed" class="card p-3 flex items-center gap-3">
    <span class="i-mdi-check-circle text-secondary-600 dark:text-secondary-400 text-lg shrink-0" />
    <div class="flex flex-col min-w-0">
      <span class="text-h5">{{ t('report_settings_title') }}</span>
      <span class="text-body-sm app-text-muted">
        {{ t('export_summary', { type: lastReportType.toUpperCase(), year: lastYear }) }}
      </span>
    </div>
  </div>

  <AppForm v-else class="flex flex-col gap-4" @submit="onSubmit">
    <div class="card card-padding-md flex flex-col gap-3">
      <h2 class="text-h5">{{ t('report_settings_title') }}</h2>
      <div class="grid grid-cols-2 gap-3">
        <AppNumberInput
          v-model="year"
          :label="t('year_label')"
          :min="2010"
          :max="2100"
          :validate="validateYear"
        />
        <AppSelect
          v-model="reportType"
          :label="t('report_type_label')"
          :placeholder="t('report_type_placeholder')"
          :options="reportTypeOptions"
          :validate="validateReportType"
        />
      </div>
    </div>

    <div class="card card-padding-md flex flex-col gap-3">
      <h2 class="text-h5">{{ t('taxpayer_info_title') }}</h2>
      <div class="grid grid-cols-2 gap-3">
        <AppTextInput v-model="taxNumber" :label="t('tax_number_label')" :validate="validateRequired" />
        <AppTextInput v-model="fullName" :label="t('full_name_label')" :validate="validateRequired" />
        <AppTextInput v-model="address1" :label="t('address_label')" :validate="validateRequired" />
        <AppTextInput v-model="city" :label="t('city_label')" :validate="validateRequired" />
        <AppTextInput v-model="postNumber" :label="t('post_number_label')" :validate="validateRequired" />
        <AppTextInput v-model="postName" :label="t('post_name_label')" :validate="validateRequired" />
        <AppTextInput v-model="countryId" :label="t('country_id_label')" :validate="validateRequired" />
        <AppTextInput v-model="countryName" :label="t('country_name_label')" :validate="validateRequired" />
      </div>
    </div>

    <div v-if="error" class="alert-error">{{ error }}</div>

    <AppButton class="button-filled-primary self-start" type="submit" :loading="loading">
      {{ t('generate_report') }}
    </AppButton>
  </AppForm>
</template>
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter app typecheck
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/app/components/export/ExportConfigStep.vue
git commit -m "feat(export): add ExportConfigStep wizard component"
```

---

## Task 6 — ExportDownloadStep

**Files:**
- Create: `app/app/components/export/ExportDownloadStep.vue`

- [ ] **Step 1: Create `ExportDownloadStep.vue`**

Terminal step. Blob URLs are created on mount and revoked on unmount.

```vue
<script setup lang="ts">
const props = defineProps<{
  outputs: { xml: string; csv: string; reportType: string };
}>();

const emit = defineEmits<{
  restart: [];
}>();

const { t } = useI18n();

const OUTPUT_FILENAMES: Record<string, { xml: string; csv: string }> = {
  kdvp: { xml: "Doh_KDVP.xml", csv: "export-trades.csv" },
  div: { xml: "Doh_Div.xml", csv: "export-dividends.csv" },
  ifi: { xml: "D_Ifi.xml", csv: "export-derivatives.csv" },
};

const xmlUrl = ref<string | null>(null);
const csvUrl = ref<string | null>(null);

function revokeUrls() {
  if (xmlUrl.value) URL.revokeObjectURL(xmlUrl.value);
  if (csvUrl.value) URL.revokeObjectURL(csvUrl.value);
  xmlUrl.value = null;
  csvUrl.value = null;
}

onMounted(() => {
  xmlUrl.value = URL.createObjectURL(
    new Blob([props.outputs.xml], { type: "application/xml" }),
  );
  csvUrl.value = URL.createObjectURL(
    new Blob([props.outputs.csv], { type: "text/csv" }),
  );
});

onUnmounted(revokeUrls);

const filenames = computed(() => OUTPUT_FILENAMES[props.outputs.reportType]);
</script>

<template>
  <div class="card card-padding-md flex flex-col gap-4">
    <h2 class="text-h5">{{ t('result_title') }}</h2>
    <div class="flex gap-3 flex-wrap">
      <a
        v-if="xmlUrl"
        :href="xmlUrl"
        :download="filenames.xml"
        class="button-filled-secondary"
      >
        {{ t('download_xml_label') }}
      </a>
      <a
        v-if="csvUrl"
        :href="csvUrl"
        :download="filenames.csv"
        class="button-filled-secondary"
      >
        {{ t('download_csv_label') }}
      </a>
    </div>
    <AppButton class="button-filled-neutral self-start" @click="emit('restart')">
      {{ t('restart_button') }}
    </AppButton>
  </div>
</template>
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter app typecheck
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/app/components/export/ExportDownloadStep.vue
git commit -m "feat(export): add ExportDownloadStep wizard component"
```

---

## Task 7 — Refactor index.vue as Orchestrator

**Files:**
- Modify: `app/app/pages/index.vue` (replace entirely)

- [ ] **Step 1: Replace `index.vue` with the thin orchestrator**

```vue
<script setup lang="ts">
definePageMeta({ ssr: false });

import type { FinancialEvents } from "@brrr/lib";

const { $toggleTheme, $theme } = useNuxtApp();
const { locale, setLocale, locales, t } = useI18n();

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
const financialEvents = ref<FinancialEvents | null>(null);
const generatedOutputs = ref<{ xml: string; csv: string; reportType: string } | null>(null);

const stepLabels = computed(() => [
  t("wizard_step_upload"),
  t("wizard_step_review"),
  t("wizard_step_configure"),
  t("wizard_step_download"),
]);

function onProcessed(events: FinancialEvents, files: FileList) {
  financialEvents.value = events;
  xmlFiles.value = files;
  currentStep.value = 2;
}

function onConfirmed() {
  currentStep.value = 3;
}

function onGenerated(outputs: { xml: string; csv: string; reportType: string }) {
  generatedOutputs.value = outputs;
  currentStep.value = 4;
}

function onRestart() {
  currentStep.value = 1;
  xmlFiles.value = null;
  financialEvents.value = null;
  generatedOutputs.value = null;
}
</script>

<template>
  <div class="py-8 flex flex-col gap-6">
    <!-- Page header -->
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div class="flex items-center justify-between gap-3">
        <h1 class="text-h1">{{ t('app_title') }}</h1>
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
        <AppButton class="button-filled-neutral" @click="$toggleTheme()">
          {{ $theme === 'dark' ? t('theme_light') : t('theme_dark') }}
        </AppButton>
      </div>
    </div>

    <!-- Stepper indicator -->
    <WizardStepper :steps="stepLabels" :current-step="currentStep" />

    <!-- Step 1: Upload (always visible; collapses after completion) -->
    <IbkrUploadStep
      :collapsed="currentStep > 1"
      :file-count="xmlFiles?.length ?? 0"
      @processed="onProcessed"
    />

    <!-- Step 2: Review (mounted only after parsing completes) -->
    <IbkrReviewStep
      v-if="financialEvents !== null"
      :financial-events="financialEvents"
      :collapsed="currentStep > 2"
      @confirmed="onConfirmed"
    />

    <!-- Step 3: Configure (mounted only once review is confirmed) -->
    <ExportConfigStep
      v-if="financialEvents !== null && currentStep >= 3"
      :financial-events="financialEvents"
      :collapsed="currentStep > 3"
      @generated="onGenerated"
    />

    <!-- Step 4: Download (mounted only after generation completes) -->
    <ExportDownloadStep
      v-if="generatedOutputs !== null && currentStep === 4"
      :outputs="generatedOutputs"
      @restart="onRestart"
    />
  </div>
</template>
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter app typecheck
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/app/pages/index.vue
git commit -m "feat(wizard): refactor index.vue as 4-step wizard orchestrator"
```

---

## Verification

### Full typecheck

```bash
pnpm --filter app typecheck
```

Expected: 0 errors.

### Manual smoke test

```bash
pnpm --filter app dev
```

Walk through:
1. **Step 1:** Select one or more IBKR XML files → click the upload button → Step 1 collapses to "N file(s) loaded", Step 2 appears with instrument table
2. **Step 2:** Verify table columns (Name, ISIN, Stock Trades, Dividends, Derivatives) have correct counts → click "Confirm & Continue" → Step 2 collapses to "N instrument(s) found", Step 3 appears
3. **Step 3:** Fill taxpayer info, select year and report type → click "Generate Report" → Step 3 collapses to "KDVP / 2024" (or whichever), Step 4 appears with download buttons
4. **Step 4:** Click XML download → verify filename is `Doh_KDVP.xml` (or appropriate); click CSV download → verify correct filename
5. **Start Over:** Click "Start Over" → wizard resets to Step 1 with empty file input
6. **Locale switch:** Set locale to Slovenian → verify all step labels, column headers, buttons in Slovenian

### Stepper indicator
- After Step 1 completes: chip 1 shows checkmark; chip 2 is highlighted; chips 3, 4 muted
- After Step 2 completes: chips 1 and 2 show checkmarks; chip 3 highlighted
- After Step 3 completes: chips 1, 2, 3 show checkmarks; chip 4 highlighted
