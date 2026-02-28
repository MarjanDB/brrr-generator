import type { Container } from "inversify";
import { IbkrBrokerageExportProvider } from "@brrr/brokerages/ibkr/IbkrBrokerageExportProvider.ts";

export function loadIbkrModule(container: Container): void {
	container.bind(IbkrBrokerageExportProvider).toResolvedValue(() => new IbkrBrokerageExportProvider());
}
