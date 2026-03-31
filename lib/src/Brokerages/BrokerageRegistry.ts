import type { IbkrBrokerageExportProvider } from "@brrr/Brokerages/Ibkr/IbkrBrokerageExportProvider";
import { StagingFinancialEvents } from "@brrr/Core/Schemas/Staging/StagingFinancialEvents";

export type BrokerageFileDetection = {
	fileName: string;
	detectedBrokerage: { id: string; name: string } | null;
};

export class BrokerageRegistry {
	constructor(private readonly ibkr: IbkrBrokerageExportProvider) {}

	public listBrokerages(): { id: string; name: string }[] {
		return [{ id: this.ibkr.brokerageId, name: this.ibkr.displayName }];
	}

	private _detectOne(file: { fileName: string; xml: string }): BrokerageFileDetection {
		const isIbkr = this.ibkr.isThisValidExport(file.xml);
		if (!isIbkr) {
			return { fileName: file.fileName, detectedBrokerage: null };
		}

		return {
			fileName: file.fileName,
			detectedBrokerage: { id: this.ibkr.brokerageId, name: this.ibkr.displayName },
		};
	}

	public detect(files: { fileName: string; xml: string }[]): BrokerageFileDetection[] {
		return files.map((f) => this._detectOne(f));
	}

	private _pickIbkrXmlStrings(
		files: { fileName: string; xml: string }[],
		detections: BrokerageFileDetection[],
	): string[] {
		const xmlStrings: string[] = [];
		for (const [i, f] of files.entries()) {
			const detection = detections[i];
			const detectedBrokerageId = detection?.detectedBrokerage?.id ?? null;
			if (detectedBrokerageId !== this.ibkr.brokerageId) continue;
			xmlStrings.push(f.xml);
		}
		return xmlStrings;
	}

	public loadAndTransformDetected(files: { fileName: string; xml: string }[]): {
		detections: BrokerageFileDetection[];
		stagingEvents: StagingFinancialEvents;
	} {
		const detections = this.detect(files);

		const ibkrXmlStrings = this._pickIbkrXmlStrings(files, detections);
		const ibkrStaging = ibkrXmlStrings.length > 0 ? this.ibkr.loadAndTransform(ibkrXmlStrings) : null;

		const stagingEventsList: StagingFinancialEvents[] = [];
		if (ibkrStaging) stagingEventsList.push(ibkrStaging);

		return {
			detections,
			stagingEvents: StagingFinancialEvents.merge(stagingEventsList),
		};
	}
}

