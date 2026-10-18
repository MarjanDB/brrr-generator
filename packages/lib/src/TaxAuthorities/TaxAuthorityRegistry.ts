import type {
	GeneratedExports,
	ITaxAuthorityProvider,
	TaxAuthorityDescriptor,
	TaxAuthorityRunContext,
} from "@brrr/TaxAuthorities/Interfaces/ITaxAuthorityProvider";
import { ReportTypeId, type TaxAuthorityId } from "@brrr/TaxAuthorities/TaxAuthorityIdentifiers";

export class TaxAuthorityRegistry {
	public constructor(private readonly slovenia: ITaxAuthorityProvider) {}

	public listAuthorities(): TaxAuthorityDescriptor[] {
		return [this.slovenia.descriptor];
	}

	// Takes the report type as a plain string, so the site and the CLI don't build a ReportTypeId.
	public async generateExports({
		authorityId,
		reportTypeId,
		...ctx
	}: TaxAuthorityRunContext & {
		authorityId: TaxAuthorityId;
		reportTypeId: string;
	}): Promise<GeneratedExports> {
		if (authorityId === this.slovenia.descriptor.authorityId) {
			return await this.slovenia.generateExports(ReportTypeId.Schema.parse(reportTypeId), ctx);
		}

		throw new Error(`Unsupported tax authority: ${authorityId}`);
	}
}
