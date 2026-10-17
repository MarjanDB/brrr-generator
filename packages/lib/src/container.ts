import { loadBrokeragesModule } from "@brrr/Brokerages/BrokeragesModule";
import { loadCoreModule } from "@brrr/Core/CoreModule";
import { InfoProvider } from "@brrr/InfoProviders/InfoProvider";
import { loadTaxAuthoritiesModule } from "@brrr/TaxAuthorities/TaxAuthoritiesModule";
import { Container } from "inversify";

export function createContainer(infoProvider: InfoProvider): Container {
	const container = new Container();

	container
		.bind<InfoProvider>(InfoProvider.Token)
		.toResolvedValue(() => infoProvider)
		.inSingletonScope();

	loadCoreModule(container);
	loadBrokeragesModule(container);
	loadTaxAuthoritiesModule(container);

	return container;
}
