import type { StagingFinancialEvents } from "@brrr/Core/Schemas/Staging/StagingFinancialEvents.ts";
import { extractFromXML, mergeTrades } from "@brrr/Brokerages/Ibkr/Transforms/Extract.ts";
import { convertSegmentedTradesToGenericUnderlyingGroups } from "@brrr/Brokerages/Ibkr/Transforms/Transform.ts";

export class IbkrBrokerageExportProvider {
	loadAndTransform(xmlStrings: string[]): StagingFinancialEvents {
		const segmentedList = xmlStrings.map((xml) => extractFromXML(xml));
		const merged = mergeTrades(segmentedList);
		return convertSegmentedTradesToGenericUnderlyingGroups(merged);
	}
}
