import type { StagingFinancialEvents } from "@brrr/Core/Schemas/Staging/StagingFinancialEvents";

export interface IBrokerageProvider {
	readonly brokerageId: string;
	readonly displayName: string;

	isThisValidExport(xmlString: string): boolean;
	loadAndTransform(xmlStrings: string[]): StagingFinancialEvents;
}
