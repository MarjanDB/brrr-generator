import { loadBrokeragesModule } from "@brrr/Brokerages/BrokeragesModule.ts";
import { loadCoreModule } from "@brrr/Core/CoreModule.ts";
import { InfoProvider } from "@brrr/InfoProviders/InfoProvider.ts";
import { loadSloveniaModule } from "@brrr/TaxAuthorities/Slovenia/SloveniaModule.ts";
import { Container } from "inversify";

export function createContainer(infoProvider: InfoProvider): Container {
	const container = new Container();

	container.bind<InfoProvider>(InfoProvider.Token).toResolvedValue(() => infoProvider).inSingletonScope();

	loadCoreModule(container);
	loadBrokeragesModule(container);
	loadSloveniaModule(container);

	return container;
}
