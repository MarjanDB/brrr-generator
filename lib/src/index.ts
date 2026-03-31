// lib entry point — re-exports added here as modules are implemented

export type { BrokerageFileDetection } from "@brrr/Brokerages/BrokerageRegistry.js";
export { BrokerageRegistry } from "@brrr/Brokerages/BrokerageRegistry.js";
// Brokerages
export { IbkrBrokerageExportProvider } from "@brrr/Brokerages/Ibkr/IbkrBrokerageExportProvider.js";
export type { IBrokerageProvider } from "@brrr/Brokerages/Interfaces/IBrokerageProvider.js";
export { ApplyIdentifierRelationshipsService } from "@brrr/Core/FinancialEvents/ApplyIdentifierRelationshipsService.js";
export { FinancialEventsProcessor } from "@brrr/Core/FinancialEvents/FinancialEventsProcessor.js";
export { LotMatcher } from "@brrr/Core/LotMatching/LotMatcher.js";
export {
	TradeEventCashTransactionDividend,
	TradeEventCashTransactionPaymentInLieuOfDividend,
	TradeEventCashTransactionWithholdingTax,
	TradeEventDerivativeAcquired,
	TradeEventStockAcquired,
} from "@brrr/Core/Schemas/Events.js";
export { FinancialEvents } from "@brrr/Core/Schemas/FinancialEvents.js";
export type { FinancialGrouping } from "@brrr/Core/Schemas/Grouping.js";
export { IdentifierChangeType } from "@brrr/Core/Schemas/IdentifierRelationship.js";
export { StagingFinancialEvents } from "@brrr/Core/Schemas/Staging/StagingFinancialEvents.js";
export { StagingFinancialGroupingProcessor } from "@brrr/Core/StagingProcessor/StagingFinancialGroupingProcessor.js";
// Core
export { createContainer } from "@brrr/container.js";
export type {
	CompanyInfo,
	CompanyLocationInfo,
	Country,
} from "@brrr/InfoProviders/InfoProvider.js";
// Info providers
export { InfoProvider, TreatyType } from "@brrr/InfoProviders/InfoProvider.js";
export { PredefinedInfoProvider } from "@brrr/InfoProviders/PredefinedInfoProvider.js";
export type {
	TaxAuthorityConfiguration,
	TaxPayerInfo,
} from "@brrr/TaxAuthorities/ConfigurationProvider.js";

// Tax authority — configuration
export {
	TaxAuthorityLotMatchingMethod,
	TaxPayerConfigSchema,
	TaxPayerType,
} from "@brrr/TaxAuthorities/ConfigurationProvider.js";
// Tax authority — interface
export type {
	ITaxAuthorityProvider,
	TaxAuthorityDescriptor,
} from "@brrr/TaxAuthorities/Interfaces/ITaxAuthorityProvider.js";
// Tax authority — Slovenia
export { DivReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Div/DivReportGenerator.js";
export { IfiReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Ifi/IfiReportGenerator.js";
export { KdvpReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Kdvp/KdvpReportGenerator.js";
export { SlovenianTaxAuthorityReportTypes } from "@brrr/TaxAuthorities/Slovenia/Schemas/ReportTypes.js";
export { SlovenianTaxAuthorityProvider } from "@brrr/TaxAuthorities/Slovenia/SlovenianTaxAuthorityProvider.js";
export { SlovenianTaxAuthorityService } from "@brrr/TaxAuthorities/Slovenia/SlovenianTaxAuthorityService.js";
export { loadTaxAuthoritiesModule } from "@brrr/TaxAuthorities/TaxAuthoritiesModule.js";
// Tax authority — registry
export {
	type GeneratedExports,
	TaxAuthorityRegistry,
} from "@brrr/TaxAuthorities/TaxAuthorityRegistry.js";
// Utils
export { zDateTimeFromISOString } from "@brrr/Utils/DateTime.js";
