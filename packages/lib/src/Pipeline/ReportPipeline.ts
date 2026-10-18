import type { BrokerRegistry } from "@brrr/Brokers/BrokerRegistry";
import type { BrokerFileDetection } from "@brrr/Brokers/Interfaces/IBrokerProvider";
import type { ImportFile } from "@brrr/Brokers/Models/ImportFile";
import type { FinancialEvents } from "@brrr/Core/Models/FinancialEvents";
import type { StagingFinancialGroupingProcessor } from "@brrr/Core/Services/StagingProcessing/StagingFinancialGroupingProcessor";
import { ProvenanceGraph } from "@brrr/Provenance/Services/ProvenanceGraph";
import type { GeneratedExports } from "@brrr/TaxAuthorities/Interfaces/ITaxAuthorityProvider";
import type { TaxAuthorityConfiguration } from "@brrr/TaxAuthorities/Models/TaxAuthorityConfiguration";
import type { TaxAuthorityId } from "@brrr/TaxAuthorities/Models/TaxAuthorityIdentifiers";
import type { TaxpayerInfo } from "@brrr/TaxAuthorities/Schemas/TaxpayerConfigSchema";
import type { TaxAuthorityRegistry } from "@brrr/TaxAuthorities/TaxAuthorityRegistry";

export type ImportResult = {
	detections: BrokerFileDetection[];
	events: FinancialEvents;
	provenance: ProvenanceGraph;
};

export type ReportRequest = {
	authorityId: TaxAuthorityId;
	reportTypeId: string;
	taxpayerInfo: TaxpayerInfo;
	reportConfig: TaxAuthorityConfiguration;
};

export type ReportResult = GeneratedExports & { provenance: ProvenanceGraph };

// The one way in: broker exports to Core events (`read`), then Core events to a tax authority's
// report (`generate`). It carries the provenance graph from one to the other, so callers never
// wire the registries and the processor together themselves.
export class ReportPipeline {
	public constructor(
		private readonly brokers: BrokerRegistry,
		private readonly staging: StagingFinancialGroupingProcessor,
		private readonly taxAuthorities: TaxAuthorityRegistry,
	) {}

	public read(files: ImportFile[]): ImportResult {
		const provenance = new ProvenanceGraph({ parent: null });
		const { detections, stagingEvents } = this.brokers.load(files, provenance);
		const events = this.staging.processStagingFinancialEvents(stagingEvents, provenance);
		return { detections, events, provenance };
	}

	// Each report records into its own layer, so reports built from one import don't mix.
	public async generate(imported: ImportResult, request: ReportRequest): Promise<ReportResult> {
		const layer = imported.provenance.layer();
		const { xml, csv } = await this.taxAuthorities.generateExports({
			...request,
			events: imported.events,
		});
		return { xml, csv, provenance: layer };
	}
}
