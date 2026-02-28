import { loadCoreModule } from "@brrr/Core/CoreModule.ts";
import { loadInfoProvidersModule } from "@brrr/InfoProviders/InfoProvidersModule.ts";
import { loadSloveniaModule } from "@brrr/TaxAuthorities/Slovenia/SloveniaModule.ts";
import { Container } from "inversify";
import { loadBrokeragesModule } from "./Brokerages/BrokeragesModule.ts";

export function createContainer(): Container {
	const container = new Container();

	loadCoreModule(container);
	loadBrokeragesModule(container);
	loadInfoProvidersModule(container);
	loadSloveniaModule(container);

	return container;
}
