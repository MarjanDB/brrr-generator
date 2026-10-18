import type { SegmentedTrades } from "@brrr/Brokers/Ibkr/Models/SegmentedTrades";
import type { IbkrExtractService } from "@brrr/Brokers/Ibkr/Services/IbkrExtractService";
import type { IbkrTransformService } from "@brrr/Brokers/Ibkr/Services/IbkrTransformService";
import type {
	BrokerFileDetection,
	IBrokerProvider,
} from "@brrr/Brokers/Interfaces/IBrokerProvider";
import { BrokerId } from "@brrr/Brokers/Models/BrokerIdentifiers";
import type { ImportFile } from "@brrr/Brokers/Models/ImportFile";
import type { StagingFinancialEvents } from "@brrr/Core/Models/Staging/StagingFinancialEvents";
import type { IProvenanceRecorder } from "@brrr/Provenance/Interfaces/IProvenanceRecorder";

export class IbkrBrokerExportProvider implements IBrokerProvider {
	public readonly brokerId = BrokerId.IBKR;
	public readonly displayName = "Interactive Brokers (Flex Query)";

	public constructor(
		private readonly extract: IbkrExtractService,
		private readonly transform: IbkrTransformService,
	) {}

	public load(
		files: ImportFile[],
		provenance: IProvenanceRecorder,
	): { detections: BrokerFileDetection[]; events: StagingFinancialEvents } {
		const detections: BrokerFileDetection[] = [];
		const recognised: SegmentedTrades[] = [];
		for (const file of files) {
			try {
				recognised.push(this.extract.extractFromXML(file, provenance));
				detections.push({
					fileName: file.fileName,
					detectedBroker: { id: this.brokerId, name: this.displayName },
					error: null,
				});
			} catch (error) {
				detections.push({
					fileName: file.fileName,
					detectedBroker: null,
					// A file that isn't a Flex Query at all is no error; one that is, but can't be read, is.
					error: file.xml.includes("<FlexQueryResponse")
						? error instanceof Error
							? error.message
							: String(error)
						: null,
				});
			}
		}

		const merged = this.extract.mergeTrades(recognised, provenance);
		return {
			detections,
			events: this.transform.convertSegmentedTradesToStagingEvents(merged, provenance),
		};
	}
}
