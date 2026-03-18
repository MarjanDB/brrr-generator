# Guided Wizard UI — Design Spec

**Date:** 2026-03-18
**Branch:** feature/internationalization-i18n
**Status:** Approved

---

## Context

The current `index.vue` is a monolithic single-form page: fill in all fields (files, report config, taxpayer info) and click generate. It offers no feedback on what was parsed, no separation of concerns, and is hard to extend.

The goal is to expose more of the power the `@brrr/lib` library provides — specifically the parsed `FinancialEvents` data — and reshape the UI into a guided, multi-step wizard that feels intuitive: upload first, see what was found, then configure the export.

---

## Design

### Wizard Steps

Four linear steps on a single page (`/`). Steps reveal progressively — completed steps collapse to a one-line summary card, active step expands. No routing changes.

| Step | Component | Description |
|------|-----------|-------------|
| 1 | `IbkrUploadStep` | Upload IBKR XML files, trigger parsing |
| 2 | `IbkrReviewStep` | See the full instrument list parsed from files |
| 3 | `ExportConfigStep` | Configure year, report type, taxpayer info |
| 4 | `ExportDownloadStep` | Download XML + CSV outputs, option to restart |

---

### Component Structure

```
app/app/
├── pages/
│   └── index.vue                        ← thin orchestrator (step state + shared data)
├── components/
│   ├── ibkr/
│   │   ├── IbkrUploadStep.vue           ← Step 1
│   │   └── IbkrReviewStep.vue           ← Step 2
│   ├── export/
│   │   ├── ExportConfigStep.vue         ← Step 3
│   │   └── ExportDownloadStep.vue       ← Step 4
│   ├── form/                            ← existing, untouched
│   └── ui/
│       ├── WizardStepper.vue            ← new step indicator strip
│       ├── AppButton.vue                ← existing
│       ├── AppBadge.vue                 ← existing
│       └── AppTooltip.vue               ← existing
```

---

### `index.vue` (Orchestrator)

Holds only:

```typescript
const currentStep = ref<1 | 2 | 3 | 4>(1)
const xmlFiles = ref<FileList | null>(null)
const financialEvents = ref<FinancialEvents | null>(null)
// raw strings (not blob URLs); blob URLs are created inside ExportDownloadStep
const generatedOutputs = ref<{ xml: string; csv: string; reportType: string } | null>(null)
```

Renders `<WizardStepper :steps="[...]" :currentStep="currentStep" />` followed by the four step components. Each step component is always mounted but only the active one is expanded; completed steps render a collapsed summary card (described in each step below). The collapsed summary card is a `div.card.card-padding-sm` with a checkmark icon, step title, and summary text — rendered inside each step component when a `collapsed` prop is true.

**Reset on restart:** `@restart` from Step 4 resets all four refs to their initial values (`currentStep = 1`, others `= null`) and clears any derived state inside step components (handled by key-resetting or explicit resets via composable).

---

### Step 1 — `IbkrUploadStep.vue`

**Props:** none
**Emits:** `processed(financialEvents: FinancialEvents, files: FileList)`
**Props (collapsed mode):** `collapsed: boolean`, `fileCount: number`

**Active state:** Shows `AppFileInput` (accept=`.xml`, multiple). On submit:
1. Read all file contents as strings via `file.text()`
2. `const container = createContainer(new ApiInfoProvider())` — `ApiInfoProvider` is the existing app-level class at `~/utils/ApiInfoProvider.ts` that implements `InfoProvider` using local JSON data + a `/api/isin/:isin` and `/api/country/:name` server route fallback
3. `container.get(IbkrBrokerageExportProvider).loadAndTransform(xmlContents)` → `stagingEvents: StagingFinancialEvents`
4. `container.get(StagingFinancialGroupingProcessor).processStagingFinancialEvents(stagingEvents)` → `financialEvents: FinancialEvents`
5. Emits `processed(financialEvents, files)`

Shows inline loading state during processing and inline error on failure.

**Collapsed summary card:** "✓ {fileCount} file(s) loaded"

---

### Step 2 — `IbkrReviewStep.vue`

**Props:** `financialEvents: FinancialEvents`, `collapsed: boolean`
**Emits:** `confirmed()`

**`FinancialEvents` shape (from `lib/src/Core/Schemas/`):**
```typescript
class FinancialEvents {
  groupings: FinancialGrouping[]
  identifierRelationships: IdentifierRelationshipAny[]
}

class FinancialGrouping {
  financialIdentifier: FinancialIdentifier  // .ticker: string | null, .isin: string | null
  stockTrades: (TradeEventStockAcquired | TradeEventStockSold)[]
  cashTransactions: TransactionCash[]       // union type — see below
  derivativeGroupings: DerivativeGrouping[] // .items: (TradeEventDerivativeAcquired | TradeEventDerivativeSold)[]
  // ...other fields not needed here
}

// TransactionCash union — defined in lib/src/Core/Schemas/Events.ts:
type TransactionCash =
  | TradeEventCashTransactionDividend
  | TradeEventCashTransactionWithholdingTax
  | TradeEventCashTransactionPaymentInLieuOfDividend
```

**Instrument table** — one row per `FinancialGrouping`:

| Column | Source |
|--------|--------|
| Name | `grouping.financialIdentifier.ticker ?? grouping.financialIdentifier.isin ?? "—"` |
| ISIN | `grouping.financialIdentifier.isin ?? "—"` |
| Stock trades | `grouping.stockTrades.length` |
| Dividends | `grouping.cashTransactions.filter(t => t instanceof TradeEventCashTransactionDividend).length` |
| Derivatives | `grouping.derivativeGroupings.reduce((sum, dg) => sum + dg.items.length, 0)` |

Emits `confirmed()` when user clicks "Looks good, continue".

**Collapsed summary card:** "✓ {groupings.length} instruments found"

---

### Step 3 — `ExportConfigStep.vue`

**Props:** `financialEvents: FinancialEvents`, `collapsed: boolean`
**Emits:** `generated(outputs: { xml: string; csv: string; reportType: string })`

**Active state form fields:**
- Year — number input, 2010–2100, default `new Date().getFullYear() - 1`
- Report type select — options: `{ value: "kdvp", label: t("report_type_kdvp") }` etc., one at a time
- Taxpayer info: tax number, name, address1, city, post number, post name, country ID (default "SI"), country name (default "Slovenija")

On submit:
1. `TaxPayerConfigSchema.parse({ taxNumber, taxpayerType: "FO", name, address1, address2: null, city, postNumber, postName, municipalityName: "", birthDate: "1990-01-01", maticnaStevilka: "", invalidskoPodjetje: false, resident: true, activityCode: "", activityName: "", countryId, countryName })`
2. `reportConfig = { fromDate: zDateTimeFromISOString.parse(`${year}-01-01`), toDate: zDateTimeFromISOString.parse(`${year + 1}-01-01`), lotMatchingMethod: TaxAuthorityLotMatchingMethod.FIFO }`
3. Instantiate `new SlovenianTaxAuthorityProvider(taxPayerInfo, reportConfig, container.get(ApplyIdentifierRelationshipsService), container.get(KdvpReportGenerator), container.get(DivReportGenerator), container.get(IfiReportGenerator))`
4. `const reportType = REPORT_MAP[selectedKey]` where `REPORT_MAP = { kdvp: SlovenianTaxAuthorityReportTypes.DOH_KDVP, div: SlovenianTaxAuthorityReportTypes.DOH_DIV, ifi: SlovenianTaxAuthorityReportTypes.D_IFI }`
5. Call both `generateExportForTaxAuthority(reportType, financialEvents)` and `generateSpreadsheetExport(reportType, financialEvents)` in parallel
6. Emit `generated({ xml, csv, reportType: selectedKey })` — `reportType` is the short key (`"kdvp"` / `"div"` / `"ifi"`), used downstream for filenames and the collapsed summary

Shows inline loading + inline error on failure.

**Collapsed summary card:** "✓ {reportType.toUpperCase()} / {year}"

---

### Step 4 — `ExportDownloadStep.vue`

**Props:** `outputs: { xml: string; csv: string; reportType: string }`
**Emits:** `restart()`

**Active state:**
- Creates blob URLs: `xmlUrl = URL.createObjectURL(new Blob([xml], { type: "application/xml" }))`, same for CSV
- Revokes URLs on `onUnmounted`
- Download buttons: XML labeled "Download XML (eDavki)", CSV labeled "Download CSV"
- Filenames from `OUTPUT_FILENAMES` map (same as current `index.vue`): `{ kdvp: { xml: "Doh_KDVP.xml", csv: "export-trades.csv" }, div: { xml: "Doh_Div.xml", csv: "export-dividends.csv" }, ifi: { xml: "D_Ifi.xml", csv: "export-derivatives.csv" } }`
- "Start over" button emits `restart()`

**No collapsed summary** — terminal step, never collapses.

---

### `WizardStepper.vue`

**Props:** `steps: string[]` (already-translated step labels), `currentStep: number` (1-based)

Renders each step as a numbered chip:
- `index + 1 < currentStep` → completed style (filled/success)
- `index + 1 === currentStep` → active style (highlighted/primary)
- `index + 1 > currentStep` → pending style (muted)

No click-to-navigate (linear flow only).

The orchestrator passes translated labels: `[t('wizard_step_upload'), t('wizard_step_review'), t('wizard_step_configure'), t('wizard_step_download')]`

---

### i18n

New translation keys added to both `app/i18n/locales/en.json` and `app/i18n/locales/sl.json`:

```
wizard_step_upload         "Upload Files"
wizard_step_review         "Review Data"
wizard_step_configure      "Configure Export"
wizard_step_download       "Download"
review_instruments_title   "Instruments Found"
review_column_name         "Name / Ticker"
review_column_isin         "ISIN"
review_column_stock_trades "Stock Trades"
review_column_dividends    "Dividends"
review_column_derivatives  "Derivatives"
review_confirm_button      "Looks good, continue"
review_summary             "{n} instrument(s) found"        ← i18n param: n
upload_summary             "{n} file(s) loaded"             ← i18n param: n
export_summary             "{type} / {year}"                ← i18n params: type (e.g. "KDVP"), year
restart_button             "Start Over"
download_xml_label         "Download XML (eDavki)"
download_csv_label         "Download CSV"
```

---

### Lib API Usage

No changes to `@brrr/lib`. Calls from current `index.vue` are preserved and redistributed:

| Library import | Moved to |
|---|---|
| `createContainer`, `IbkrBrokerageExportProvider`, `StagingFinancialGroupingProcessor` | `IbkrUploadStep` |
| `FinancialEvents`, `FinancialGrouping`, `TradeEventCashTransactionDividend` (types) | `IbkrReviewStep` |
| `TaxPayerConfigSchema`, `SlovenianTaxAuthorityProvider`, `KdvpReportGenerator`, `DivReportGenerator`, `IfiReportGenerator`, `ApplyIdentifierRelationshipsService`, `TaxAuthorityLotMatchingMethod`, `zDateTimeFromISOString`, `SlovenianTaxAuthorityReportTypes` | `ExportConfigStep` |
| `ApiInfoProvider` (app util, not lib) | `IbkrUploadStep` + `ExportConfigStep` |

---

### Error Handling

- Step 1: parse errors shown inline below the file input
- Step 3: generation errors shown inline below the submit button
- Step 4: blob URL creation is synchronous and cannot fail in practice; no special error handling needed
- Step 2: no error path (read-only display of already-parsed data)

---

## Verification

1. `pnpm --filter app dev` — run dev server
2. Upload a valid IBKR XML export → verify Step 2 shows instrument table with correct name/ISIN/trade counts
3. Click "Looks good, continue" → Step 3 expands; Step 2 collapses to "{n} instruments found"
4. Fill taxpayer info + select report type + year → click generate → Step 4 expands; Step 3 collapses to "{type} / {year}"
5. Download XML and CSV — verify file names and content are valid
6. Click "Start over" — all state clears, wizard resets to Step 1
7. `pnpm --filter app typecheck` — no TypeScript errors
8. Switch to Slovenian locale — verify all new strings are translated and displayed correctly
