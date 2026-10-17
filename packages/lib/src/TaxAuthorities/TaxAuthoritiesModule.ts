import { loadSloveniaModule } from "@brrr/TaxAuthorities/Slovenia/SloveniaModule";
import { SlovenianTaxAuthorityProvider } from "@brrr/TaxAuthorities/Slovenia/SlovenianTaxAuthorityProvider";
import { TaxAuthorityRegistry } from "@brrr/TaxAuthorities/TaxAuthorityRegistry";
import type { Container } from "inversify";

export function loadTaxAuthoritiesModule(container: Container): void {
	loadSloveniaModule(container);

	container
		.bind(TaxAuthorityRegistry)
		.toResolvedValue(
			(slovenia: SlovenianTaxAuthorityProvider) => new TaxAuthorityRegistry(slovenia),
			[SlovenianTaxAuthorityProvider],
		)
		.inSingletonScope();
}
