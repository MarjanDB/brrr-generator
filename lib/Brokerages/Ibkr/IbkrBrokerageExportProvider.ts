import type { StagingFinancialEvents } from "@brrr/Core/Schemas/Staging/StagingFinancialEvents.ts";
import { extractFromXML, mergeTrades } from "./Transforms/Extract.ts";
import { convertSegmentedTradesToGenericUnderlyingGroups } from "./Transforms/Transform.ts";

export class IbkrBrokerageExportProvider {
	loadAndTransform(xmlStrings: string[]): StagingFinancialEvents {
		const segmentedList = xmlStrings.map((xml) => extractFromXML(xml));
		const merged = mergeTrades(segmentedList);
		return convertSegmentedTradesToGenericUnderlyingGroups(merged);
	}
}
