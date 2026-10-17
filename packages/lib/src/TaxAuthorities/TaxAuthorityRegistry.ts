import type {
	GeneratedExports,
	ITaxAuthorityProvider,
	TaxAuthorityDescriptor,
	TaxAuthorityRunContext,
} from "@brrr/TaxAuthorities/Interfaces/ITaxAuthorityProvider";
import type { ReportTypeId, TaxAuthorityId } from "@brrr/TaxAuthorities/TaxAuthorityIdentifiers";

export class TaxAuthorityRegistry {
	constructor(private readonly slovenia: ITaxAuthorityProvider) {}

	public listAuthorities(): TaxAuthorityDescriptor[] {
		return [this.slovenia.descriptor];
	}

	public async generateExports({
		authorityId,
		reportTypeId,
		...ctx
	}: TaxAuthorityRunContext & {
		authorityId: TaxAuthorityId;
		reportTypeId: ReportTypeId;
	}): Promise<GeneratedExports> {
		if (authorityId === this.slovenia.descriptor.authorityId) {
			return await this.slovenia.generateExports(reportTypeId, ctx);
		}

		throw new Error(`Unsupported tax authority: ${authorityId}`);
	}
}
