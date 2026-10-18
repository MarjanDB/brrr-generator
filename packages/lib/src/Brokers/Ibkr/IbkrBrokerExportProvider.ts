import type { IbkrExtractService } from "@brrr/Brokers/Ibkr/Services/IbkrExtractService";
import type { IbkrTransformService } from "@brrr/Brokers/Ibkr/Services/IbkrTransformService";
import type { IBrokerProvider } from "@brrr/Brokers/Interfaces/IBrokerProvider";
import { BrokerId } from "@brrr/Brokers/Models/BrokerIdentifiers";
import type { StagingFinancialEvents } from "@brrr/Core/Models/Staging/StagingFinancialEvents";
import { NullProvenanceRecorder } from "@brrr/Provenance/Services/NullProvenanceRecorder";

export class IbkrBrokerExportProvider implements IBrokerProvider {
	public readonly brokerId = BrokerId.IBKR;
	public readonly displayName = "Interactive Brokers (Flex Query)";

	public constructor(
		private readonly extract: IbkrExtractService,
		private readonly transform: IbkrTransformService,
	) {}

	public isThisValidExport(xmlString: string): boolean {
		return this.extractionError(xmlString) === null;
	}

	public describeExportProblem(xmlString: string): string | null {
		if (!xmlString.includes("<FlexQueryResponse")) {
			return null;
		}
		return this.extractionError(xmlString);
	}

	public loadAndTransform(xmlStrings: string[]): StagingFinancialEvents {
		const segmentedList = xmlStrings.map((xml) =>
			this.extract.extractFromXML({ fileName: "", xml }, new NullProvenanceRecorder()),
		);

		const merged = this.extract.mergeTrades(segmentedList, new NullProvenanceRecorder());
		const transformed = this.transform.convertSegmentedTradesToStagingEvents(
			merged,
			new NullProvenanceRecorder(),
		);

		return transformed;
	}

	private extractionError(xmlString: string): string | null {
		try {
			this.extract.extractFromXML({ fileName: "", xml: xmlString }, new NullProvenanceRecorder());
			return null;
		} catch (error) {
			return error instanceof Error ? error.message : String(error);
		}
	}
}
