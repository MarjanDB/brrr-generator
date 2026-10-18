import type { BrokerId } from "@brrr/Brokers/BrokerIdentifiers";
import type { IBrokerProvider } from "@brrr/Brokers/Interfaces/IBrokerProvider";
import { StagingFinancialEvents } from "@brrr/Core/Models/Staging/StagingFinancialEvents";

export type BrokerFileDetection = {
	fileName: string;
	detectedBroker: { id: BrokerId; name: string } | null;
	// Set when the file looks like a broker's export but can't be read.
	error: string | null;
};

export class BrokerRegistry {
	public constructor(private readonly ibkr: IBrokerProvider) {}

	public listBrokers(): { id: BrokerId; name: string }[] {
		return [{ id: this.ibkr.brokerId, name: this.ibkr.displayName }];
	}

	private detectOne(file: { fileName: string; xml: string }): BrokerFileDetection {
		const isIbkr = this.ibkr.isThisValidExport(file.xml);
		if (!isIbkr) {
			return {
				fileName: file.fileName,
				detectedBroker: null,
				error: this.ibkr.describeExportProblem(file.xml),
			};
		}

		return {
			fileName: file.fileName,
			detectedBroker: { id: this.ibkr.brokerId, name: this.ibkr.displayName },
			error: null,
		};
	}

	public detect(files: { fileName: string; xml: string }[]): BrokerFileDetection[] {
		return files.map((f) => this.detectOne(f));
	}

	private pickIbkrXmlStrings(
		files: { fileName: string; xml: string }[],
		detections: BrokerFileDetection[],
	): string[] {
		const xmlStrings: string[] = [];
		for (const [i, f] of files.entries()) {
			const detection = detections[i];
			const detectedBrokerId = detection?.detectedBroker?.id ?? null;
			if (detectedBrokerId !== this.ibkr.brokerId) continue;
			xmlStrings.push(f.xml);
		}
		return xmlStrings;
	}

	public loadAndTransformDetected(files: { fileName: string; xml: string }[]): {
		detections: BrokerFileDetection[];
		stagingEvents: StagingFinancialEvents;
	} {
		const detections = this.detect(files);

		const ibkrXmlStrings = this.pickIbkrXmlStrings(files, detections);
		const ibkrStaging =
			ibkrXmlStrings.length > 0 ? this.ibkr.loadAndTransform(ibkrXmlStrings) : null;

		const stagingEventsList: StagingFinancialEvents[] = [];
		if (ibkrStaging) stagingEventsList.push(ibkrStaging);

		return {
			detections,
			stagingEvents: StagingFinancialEvents.merge(stagingEventsList),
		};
	}
}
