import { loadBrokeragesModule } from "@brrr/Brokerages/BrokeragesModule.js";
import { loadCoreModule } from "@brrr/Core/CoreModule.js";
import { InfoProvider } from "@brrr/InfoProviders/InfoProvider.js";
import { loadSloveniaModule } from "@brrr/TaxAuthorities/Slovenia/SloveniaModule.js";
import { Container } from "inversify";

export function createContainer(infoProvider: InfoProvider): Container {
	const container = new Container();

	container
		.bind<InfoProvider>(InfoProvider.Token)
		.toResolvedValue(() => infoProvider)
		.inSingletonScope();

	loadCoreModule(container);
	loadBrokeragesModule(container);
	loadSloveniaModule(container);

	return container;
}
