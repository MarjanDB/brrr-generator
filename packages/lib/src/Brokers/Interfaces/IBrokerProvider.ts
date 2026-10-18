import type { BrokerId } from "@brrr/Brokers/BrokerIdentifiers";
import type { StagingFinancialEvents } from "@brrr/Core/Schemas/Staging/StagingFinancialEvents";

export interface IBrokerProvider {
	readonly brokerId: BrokerId;
	readonly displayName: string;

	isThisValidExport(xmlString: string): boolean;
	// Why a file that looks like this broker's export can't be read; null for a valid export and
	// for files that aren't this broker's at all.
	describeExportProblem(xmlString: string): string | null;
	loadAndTransform(xmlStrings: string[]): StagingFinancialEvents;
}
