import { loadSloveniaModule } from "@brrr/TaxAuthorities/Slovenia/SloveniaModule";
import { SlovenianTaxAuthorityService } from "@brrr/TaxAuthorities/Slovenia/SlovenianTaxAuthorityService";
import { TaxAuthorityRegistry } from "@brrr/TaxAuthorities/TaxAuthorityRegistry";
import type { Container } from "inversify";

export function loadTaxAuthoritiesModule(container: Container): void {
	loadSloveniaModule(container);

	container
		.bind(TaxAuthorityRegistry)
		.toResolvedValue(
			(slovenia: SlovenianTaxAuthorityService) => new TaxAuthorityRegistry(slovenia),
			[SlovenianTaxAuthorityService],
		)
		.inSingletonScope();
}
