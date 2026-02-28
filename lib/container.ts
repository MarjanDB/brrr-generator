import { loadIbkrModule } from "@brrr/Brokerages/Ibkr/IbkrModule.ts";
import { loadCoreModule } from "@brrr/Core/CoreModule.ts";
import { loadInfoProvidersModule } from "@brrr/InfoProviders/InfoProvidersModule.ts";
import { loadSloveniaModule } from "@brrr/TaxAuthorities/Slovenia/SloveniaModule.ts";
import { Container } from "inversify";

export function createContainer(): Container {
	const container = new Container();

	loadCoreModule(container);
	loadIbkrModule(container);
	loadInfoProvidersModule(container);
	loadSloveniaModule(container);

	return container;
}
