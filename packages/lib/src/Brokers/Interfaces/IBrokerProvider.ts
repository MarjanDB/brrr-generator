import type { BrokerId } from "@brrr/Brokers/Models/BrokerIdentifiers";
import type { ImportFile } from "@brrr/Brokers/Models/ImportFile";
import type { StagingFinancialEvents } from "@brrr/Core/Models/Staging/StagingFinancialEvents";
import type { IProvenanceRecorder } from "@brrr/Provenance/Interfaces/IProvenanceRecorder";

export type BrokerFileDetection = {
	fileName: string;
	detectedBroker: { id: BrokerId; name: string } | null;
	// Set when the file looks like a broker's export but can't be read.
	error: string | null;
};

export interface IBrokerProvider {
	readonly brokerId: BrokerId;
	readonly displayName: string;

	// Reads each file once: says which ones are this broker's, and turns those into staging events.
	// The caller records the files as nodes; the provider records what it makes from them.
	load(
		files: ImportFile[],
		provenance: IProvenanceRecorder,
	): { detections: BrokerFileDetection[]; events: StagingFinancialEvents };
}
