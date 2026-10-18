import { loadBrokersModule } from "@brrr/Brokers/BrokersModule";
import { loadCoreModule } from "@brrr/Core/CoreModule";
import { IInfoProvider } from "@brrr/InfoProviders/IInfoProvider";
import { loadTaxAuthoritiesModule } from "@brrr/TaxAuthorities/TaxAuthoritiesModule";
import { Container } from "inversify";

export function createContainer(infoProvider: IInfoProvider): Container {
	const container = new Container();

	container
		.bind<IInfoProvider>(IInfoProvider.Token)
		.toResolvedValue(() => infoProvider)
		.inSingletonScope();

	loadCoreModule(container);
	loadBrokersModule(container);
	loadTaxAuthoritiesModule(container);

	return container;
}
