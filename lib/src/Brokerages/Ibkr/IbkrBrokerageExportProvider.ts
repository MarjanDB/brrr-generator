import type { IbkrExtractService } from "@brrr/Brokerages/Ibkr/Extract";
import type { IbkrTransformService } from "@brrr/Brokerages/Ibkr/Transform";
import type { StagingFinancialEvents } from "@brrr/Core/Schemas/Staging/StagingFinancialEvents";

export class IbkrBrokerageExportProvider {
	constructor(
		private readonly extract: IbkrExtractService,
		private readonly transform: IbkrTransformService,
	) {}

	public loadAndTransform(xmlStrings: string[]): StagingFinancialEvents {
		const segmentedList = xmlStrings.map((xml) => this.extract.extractFromXML(xml));

		const merged = this.extract.mergeTrades(segmentedList);
		const transformed = this.transform.convertSegmentedTradesToStagingEvents(merged);

		return transformed;
	}
}
