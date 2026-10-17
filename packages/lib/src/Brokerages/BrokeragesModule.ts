import { BrokerageRegistry } from "@brrr/Brokerages/BrokerageRegistry";
import { IbkrBrokerageExportProvider } from "@brrr/Brokerages/Ibkr/IbkrBrokerageExportProvider";
import { loadIbkrModule } from "@brrr/Brokerages/Ibkr/IbkrModule";
import type { Container } from "inversify";

export function loadBrokeragesModule(container: Container): void {
	loadIbkrModule(container);

	container
		.bind(BrokerageRegistry)
		.toResolvedValue(
			(ibkr: IbkrBrokerageExportProvider) => new BrokerageRegistry(ibkr),
			[IbkrBrokerageExportProvider],
		)
		.inSingletonScope();
}
