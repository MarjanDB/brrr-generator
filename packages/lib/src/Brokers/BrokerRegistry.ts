import type {
	BrokerFileDetection,
	IBrokerProvider,
} from "@brrr/Brokers/Interfaces/IBrokerProvider";
import type { BrokerId } from "@brrr/Brokers/Models/BrokerIdentifiers";
import type { ImportFile } from "@brrr/Brokers/Models/ImportFile";
import { StagingFinancialEvents } from "@brrr/Core/Models/Staging/StagingFinancialEvents";
import type { IProvenanceRecorder } from "@brrr/Provenance/Interfaces/IProvenanceRecorder";
import { DropReason } from "@brrr/Provenance/Models/DropReason";
import { ProvenanceDetail } from "@brrr/Provenance/Models/ProvenanceDetail";
import { ProvenanceDetailKind } from "@brrr/Provenance/Models/ProvenanceDetailKind";
import { ProvenanceDetailValue } from "@brrr/Provenance/Models/ProvenanceDetailValue";
import { ProvenanceStage } from "@brrr/Provenance/Models/ProvenanceIdentifiers";
import { ProvenanceNodeKind } from "@brrr/Provenance/Models/ProvenanceNodeKind";

const STAGE = ProvenanceStage.Schema.parse("BrokerRegistry");

export class BrokerRegistry {
	public constructor(private readonly ibkr: IBrokerProvider) {}

	public listBrokers(): { id: BrokerId; name: string }[] {
		return [{ id: this.ibkr.brokerId, name: this.ibkr.displayName }];
	}

	public load(
		files: ImportFile[],
		provenance: IProvenanceRecorder,
	): { detections: BrokerFileDetection[]; stagingEvents: StagingFinancialEvents } {
		for (const file of files) {
			provenance.node(file, ProvenanceNodeKind.FILE, file.fileName, {});
		}

		const { detections, events } = this.ibkr.load(files, provenance);

		for (const [index, file] of files.entries()) {
			const detection = detections[index];
			if (detection.detectedBroker !== null) continue;
			if (detection.error !== null) {
				provenance.drop(
					file,
					DropReason.UNREADABLE,
					STAGE,
					new ProvenanceDetail({
						kind: ProvenanceDetailKind.FILE_ERROR,
						values: { [ProvenanceDetailValue.ERROR]: detection.error },
					}),
				);
			} else {
				provenance.drop(file, DropReason.NOT_RECOGNISED, STAGE, null);
			}
		}

		return { detections, stagingEvents: StagingFinancialEvents.merge([events]) };
	}
}
