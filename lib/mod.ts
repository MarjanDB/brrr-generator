// lib entry point — re-exports added here as modules are implemented
export { createContainer } from "@brrr/container.ts";

// Brokerages
export { IbkrBrokerageExportProvider } from "@brrr/Brokerages/Ibkr/IbkrBrokerageExportProvider.ts";

// Core
export { LotMatcher } from "@brrr/Core/LotMatching/LotMatcher.ts";
export { FinancialEventsProcessor } from "@brrr/Core/FinancialEvents/FinancialEventsProcessor.ts";
export { ApplyIdentifierRelationshipsService } from "@brrr/Core/FinancialEvents/ApplyIdentifierRelationshipsService.ts";
export { StagingFinancialGroupingProcessor } from "@brrr/Core/StagingProcessor/StagingFinancialGroupingProcessor.ts";
export { IdentifierChangeType } from "@brrr/Core/Schemas/IdentifierRelationship.ts";

// Info providers
export { TreatyType, InfoProvider } from "@brrr/InfoProviders/InfoLookupProvider.ts";
export type { Country, CompanyLocationInfo, CompanyInfo } from "@brrr/InfoProviders/InfoLookupProvider.ts";

// Tax authority — interface
export type { ITaxAuthorityProvider } from "@brrr/TaxAuthorities/TaxAuthorityProvider.ts";

// Tax authority — configuration
export { TaxAuthorityLotMatchingMethod, TaxPayerType } from "@brrr/TaxAuthorities/ConfigurationProvider.ts";
export type { TaxAuthorityConfiguration, TaxPayerInfo } from "@brrr/TaxAuthorities/ConfigurationProvider.ts";

// Tax authority — Slovenia
export { SlovenianTaxAuthorityProvider } from "@brrr/TaxAuthorities/Slovenia/SlovenianTaxAuthorityProvider.ts";
export { SlovenianTaxAuthorityReportTypes } from "@brrr/TaxAuthorities/Slovenia/Schemas/ReportTypes.ts";
export { KdvpReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Kdvp/KdvpReportGenerator.ts";
export { DivReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Div/DivReportGenerator.ts";
export { IfiReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Ifi/IfiReportGenerator.ts";
