import { Container } from "inversify";
import { loadCoreModule } from "@brrr/core/CoreModule.ts";
import { loadIbkrModule } from "@brrr/brokerages/ibkr/IbkrModule.ts";
import { loadInfoProvidersModule } from "@brrr/infoProviders/InfoProvidersModule.ts";
import { loadSloveniaModule } from "@brrr/taxAuthorities/slovenia/SloveniaModule.ts";

export function createContainer(): Container {
	const container = new Container();
	loadCoreModule(container);
	loadIbkrModule(container);
	loadInfoProvidersModule(container);
	loadSloveniaModule(container);
	return container;
}
