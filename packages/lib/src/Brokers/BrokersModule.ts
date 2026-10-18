import { BrokerRegistry } from "@brrr/Brokers/BrokerRegistry";
import { IbkrBrokerExportProvider } from "@brrr/Brokers/Ibkr/IbkrBrokerExportProvider";
import { loadIbkrModule } from "@brrr/Brokers/Ibkr/IbkrModule";
import type { Container } from "inversify";

export function loadBrokersModule(container: Container): void {
	loadIbkrModule(container);

	container
		.bind(BrokerRegistry)
		.toResolvedValue(
			(ibkr: IbkrBrokerExportProvider) => new BrokerRegistry(ibkr),
			[IbkrBrokerExportProvider],
		)
		.inSingletonScope();
}
