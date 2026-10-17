import type { FinancialEvents } from "@brrr/Core/Schemas/FinancialEvents";
import type {
	TaxAuthorityConfiguration,
	TaxPayerInfo,
} from "@brrr/TaxAuthorities/ConfigurationProvider";
import type {
	GeneratedExports,
	TaxAuthorityDescriptor,
} from "@brrr/TaxAuthorities/Interfaces/ITaxAuthorityProvider";
import type { SlovenianTaxAuthorityProvider } from "@brrr/TaxAuthorities/Slovenia/SlovenianTaxAuthorityProvider";

export class TaxAuthorityRegistry {
	constructor(private readonly slovenia: SlovenianTaxAuthorityProvider) {}

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
			return await this.slovenia.generateExports(args.reportTypeId, {
				taxPayerInfo: args.taxPayerInfo,
				reportConfig: args.reportConfig,
				events: args.events,
			});
		}

		throw new Error(`Unsupported tax authority: ${args.authorityId}`);
	}
}
