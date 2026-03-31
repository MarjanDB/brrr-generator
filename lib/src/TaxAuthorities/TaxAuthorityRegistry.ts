import type { FinancialEvents } from "@brrr/Core/Schemas/FinancialEvents";
import type {
	TaxAuthorityConfiguration,
	TaxPayerInfo,
} from "@brrr/TaxAuthorities/ConfigurationProvider";
import type { TaxAuthorityDescriptor } from "@brrr/TaxAuthorities/Interfaces/ITaxAuthorityProvider";
import type { SlovenianTaxAuthorityService } from "@brrr/TaxAuthorities/Slovenia/SlovenianTaxAuthorityService";

export type GeneratedExports = { xml: string; csv: string };

export class TaxAuthorityRegistry {
	constructor(private readonly slovenia: SlovenianTaxAuthorityService) {}

	public listAuthorities(): TaxAuthorityDescriptor[] {
		return [this.slovenia.descriptor];
	}

	public async generateExports(args: {
		authorityId: string;
		reportTypeId: string;
		taxPayerInfo: TaxPayerInfo;
		reportConfig: TaxAuthorityConfiguration;
		events: FinancialEvents;
	}): Promise<GeneratedExports> {
		if (args.authorityId === this.slovenia.descriptor.authorityId) {
			return await this.slovenia.generateExports({
				reportTypeId: args.reportTypeId,
				taxPayerInfo: args.taxPayerInfo,
				reportConfig: args.reportConfig,
				events: args.events,
			});
		}

		throw new Error(`Unsupported tax authority: ${args.authorityId}`);
	}
}
