import type { Container } from "inversify";
import { InfoProvider } from "@brrr/InfoProviders/InfoLookupProvider.ts";
import { NodeJsonCompanyLookupProvider } from "@brrr/InfoProviders/NodeJsonInfoLookupProvider.ts";

export function loadInfoProvidersModule(
	container: Container,
	overrides?: {
		infoProvider?: InfoProvider;
	},
): void {
	const infoProvider: InfoProvider = overrides?.infoProvider ?? new NodeJsonCompanyLookupProvider();

	container.bind<InfoProvider>(InfoProvider.Token).toResolvedValue(() => infoProvider);
}
