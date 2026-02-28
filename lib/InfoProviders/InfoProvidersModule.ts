import type { Container } from "inversify";
import { CompanyLookupProvider, CountryLookupProvider } from "@brrr/InfoProviders/InfoLookupProvider.ts";

export function loadInfoProvidersModule(container: Container): void {
	container.bind(CountryLookupProvider).toResolvedValue(() => new CountryLookupProvider());
	container.bind(CompanyLookupProvider).toResolvedValue(() => new CompanyLookupProvider());
}
