import type { IbkrExtractService } from "@brrr/Brokerages/Ibkr/Extract";
import type { IbkrTransformService } from "@brrr/Brokerages/Ibkr/Transform";
import type { IBrokerageProvider } from "@brrr/Brokerages/Interfaces/IBrokerageProvider";
import type { StagingFinancialEvents } from "@brrr/Core/Schemas/Staging/StagingFinancialEvents";

export class IbkrBrokerageExportProvider implements IBrokerageProvider {
	public readonly brokerageId = "ibkr";
	public readonly displayName = "Interactive Brokers (Flex Query)";

	constructor(
		private readonly extract: IbkrExtractService,
		private readonly transform: IbkrTransformService,
	) {}

	public isThisValidExport(xmlString: string): boolean {
		try {
			this.extract.extractFromXML(xmlString);
			return true;
		} catch {
			return false;
		}
	}

	public loadAndTransform(xmlStrings: string[]): StagingFinancialEvents {
		const segmentedList = xmlStrings.map((xml) => this.extract.extractFromXML(xml));

		const merged = this.extract.mergeTrades(segmentedList);
		const transformed = this.transform.convertSegmentedTradesToStagingEvents(merged);

		return transformed;
	}
}
