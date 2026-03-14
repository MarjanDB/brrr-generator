// lib entry point — re-exports added here as modules are implemented
export { createContainer } from "@brrr/container.js";

// Brokerages
export { IbkrBrokerageExportProvider } from "@brrr/Brokerages/Ibkr/IbkrBrokerageExportProvider.js";

// Core
export { ApplyIdentifierRelationshipsService } from "@brrr/Core/FinancialEvents/ApplyIdentifierRelationshipsService.js";
export { FinancialEventsProcessor } from "@brrr/Core/FinancialEvents/FinancialEventsProcessor.js";
export { LotMatcher } from "@brrr/Core/LotMatching/LotMatcher.js";
export { IdentifierChangeType } from "@brrr/Core/Schemas/IdentifierRelationship.js";
export { StagingFinancialGroupingProcessor } from "@brrr/Core/StagingProcessor/StagingFinancialGroupingProcessor.js";

// Info providers
export { InfoProvider, TreatyType } from "@brrr/InfoProviders/InfoProvider.js";
export type { CompanyInfo, CompanyLocationInfo, Country } from "@brrr/InfoProviders/InfoProvider.js";
export { PredefinedInfoProvider } from "@brrr/InfoProviders/PredefinedInfoProvider.js";

// Tax authority — interface
export type { ITaxAuthorityProvider } from "@brrr/TaxAuthorities/TaxAuthorityProvider.js";

// Tax authority — configuration
export { TaxAuthorityLotMatchingMethod, TaxPayerConfigSchema, TaxPayerType } from "@brrr/TaxAuthorities/ConfigurationProvider.js";
export type { TaxAuthorityConfiguration, TaxPayerInfo } from "@brrr/TaxAuthorities/ConfigurationProvider.js";

// Utils
export { zDateTimeFromISOString } from "@brrr/Utils/DateTime.js";

// Tax authority — Slovenia
export { DivReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Div/DivReportGenerator.js";
export { IfiReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Ifi/IfiReportGenerator.js";
export { KdvpReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Kdvp/KdvpReportGenerator.js";
export { SlovenianTaxAuthorityReportTypes } from "@brrr/TaxAuthorities/Slovenia/Schemas/ReportTypes.js";
export { SlovenianTaxAuthorityProvider } from "@brrr/TaxAuthorities/Slovenia/SlovenianTaxAuthorityProvider.js";

