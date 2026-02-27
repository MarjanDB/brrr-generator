import { DateTime } from "luxon";
import type { FinancialEvents } from "@brrr/core/schemas/FinancialEvents.ts";
import { IdentifierChangeType } from "@brrr/core/schemas/IdentifierRelationship.ts";
import { ApplyIdentifierRelationshipsService } from "@brrr/core/financialEvents/ApplyIdentifierRelationshipsService.ts";
import { FinancialEventsProcessor } from "@brrr/core/financialEvents/FinancialEventsProcessor.ts";
import { LotMatcher } from "@brrr/core/lotMatching/LotMatcher.ts";
import type { TaxPayerInfo, TaxAuthorityConfiguration } from "@brrr/taxAuthorities/ConfigurationProvider.ts";
import { SlovenianTaxAuthorityReportTypes, EDavkiDocumentWorkflowType } from "./schemas/ReportTypes.ts";
import type {
  EDavkiGenericTradeReportItem,
  EDavkiDividendReportLine,
  EDavkiGenericDerivativeReportItem,
} from "./schemas/Schemas.ts";
import { convertTradesToKdvpItems } from "./reportGeneration/kdvp/Common.ts";
import { generateXmlReport as generateKdvpXml } from "./reportGeneration/kdvp/XmlDohKdvp.ts";
import { generateCsvReport as generateKdvpCsv } from "./reportGeneration/kdvp/CsvDohKdvp.ts";
import { convertCashTransactionsToDivItems } from "./reportGeneration/div/Common.ts";
import { generateXmlReport as generateDivXml } from "./reportGeneration/div/XmlDohDiv.ts";
import { generateCsvReport as generateDivCsv } from "./reportGeneration/div/CsvDohDiv.ts";
import { convertTradesToIfiItems } from "./reportGeneration/ifi/Common.ts";
import { generateXmlReport as generateIfiXml } from "./reportGeneration/ifi/XmlDIfi.ts";
import { generateCsvReport as generateIfiCsv } from "./reportGeneration/ifi/CsvDIfi.ts";

type SlovenianReportData =
  | EDavkiGenericTradeReportItem[]
  | EDavkiDividendReportLine[]
  | EDavkiGenericDerivativeReportItem[];

export class SlovenianTaxAuthorityProvider {
  private taxPayerInfo: TaxPayerInfo;
  private reportConfig: TaxAuthorityConfiguration;
  private applyIdentifierRelationshipsService: ApplyIdentifierRelationshipsService;
  private countedGroupingProcessor: FinancialEventsProcessor;

  constructor(taxPayerInfo: TaxPayerInfo, reportConfig: TaxAuthorityConfiguration) {
    this.taxPayerInfo = taxPayerInfo;
    this.reportConfig = reportConfig;
    this.applyIdentifierRelationshipsService = new ApplyIdentifierRelationshipsService();
    this.countedGroupingProcessor = new FinancialEventsProcessor(null, new LotMatcher());
  }

  isSelfReport(currentTime: DateTime): boolean {
    const currentYear = currentTime.year;
    const lastYear = currentYear - 1;
    const reportEndPeriod = this.reportConfig.toDate.minus({ days: 1 }).year;
    return reportEndPeriod < lastYear;
  }

  generateReportData(
    reportType: SlovenianTaxAuthorityReportTypes,
    events: FinancialEvents,
  ): SlovenianReportData {
    const applied = this.applyIdentifierRelationshipsService.apply(events, [
      IdentifierChangeType.RENAME,
      IdentifierChangeType.SPLIT,
      IdentifierChangeType.REVERSE_SPLIT,
    ]);
    const data = applied.groupings;

    if (reportType === SlovenianTaxAuthorityReportTypes.DOH_KDVP) {
      return convertTradesToKdvpItems(this.reportConfig, data, this.countedGroupingProcessor);
    }

    if (reportType === SlovenianTaxAuthorityReportTypes.DOH_DIV) {
      return convertCashTransactionsToDivItems(this.reportConfig, data);
    }

    if (reportType === SlovenianTaxAuthorityReportTypes.D_IFI) {
      return convertTradesToIfiItems(this.reportConfig, data, this.countedGroupingProcessor);
    }

    return [];
  }

  generateExportForTaxAuthority(
    reportType: SlovenianTaxAuthorityReportTypes,
    events: FinancialEvents,
  ): string {
    const reportData = this.generateReportData(reportType, events);

    if (reportType === SlovenianTaxAuthorityReportTypes.DOH_KDVP) {
      return generateKdvpXml(
        this.reportConfig,
        this.taxPayerInfo,
        EDavkiDocumentWorkflowType.ORIGINAL,
        reportData as EDavkiGenericTradeReportItem[],
      );
    }

    if (reportType === SlovenianTaxAuthorityReportTypes.DOH_DIV) {
      const isSelfReport = this.isSelfReport(DateTime.now());
      return generateDivXml(
        this.reportConfig,
        this.taxPayerInfo,
        isSelfReport,
        reportData as EDavkiDividendReportLine[],
      );
    }

    if (reportType === SlovenianTaxAuthorityReportTypes.D_IFI) {
      return generateIfiXml(
        this.reportConfig,
        reportData as EDavkiGenericDerivativeReportItem[],
      );
    }

    return "";
  }

  generateSpreadsheetExport(
    reportType: SlovenianTaxAuthorityReportTypes,
    events: FinancialEvents,
  ): Record<string, unknown>[] {
    const reportData = this.generateReportData(reportType, events);

    if (reportType === SlovenianTaxAuthorityReportTypes.DOH_KDVP) {
      return generateKdvpCsv(reportData as EDavkiGenericTradeReportItem[]);
    }

    if (reportType === SlovenianTaxAuthorityReportTypes.DOH_DIV) {
      return generateDivCsv(reportData as EDavkiDividendReportLine[]);
    }

    if (reportType === SlovenianTaxAuthorityReportTypes.D_IFI) {
      return generateIfiCsv(reportData as EDavkiGenericDerivativeReportItem[]);
    }

    return [];
  }
}
