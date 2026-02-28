import type { StagingFinancialEvents } from "@brrr/core/schemas/staging/StagingFinancialEvents.ts";
import { extractFromXML, mergeTrades } from "./transforms/Extract.ts";
import { convertSegmentedTradesToGenericUnderlyingGroups } from "./transforms/Transform.ts";

export class IbkrBrokerageExportProvider {
	loadAndTransform(xmlStrings: string[]): StagingFinancialEvents {
		const segmentedList = xmlStrings.map((xml) => extractFromXML(xml));
		const merged = mergeTrades(segmentedList);
		return convertSegmentedTradesToGenericUnderlyingGroups(merged);
	}
}
