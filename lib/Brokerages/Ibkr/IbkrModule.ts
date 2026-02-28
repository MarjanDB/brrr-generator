import { IbkrBrokerageExportProvider } from "@brrr/Brokerages/Ibkr/IbkrBrokerageExportProvider.ts";
import type { Container } from "inversify";
import { IbkrExtractService } from "./Extract.ts";
import { IbkrTransformService } from "./Transform.ts";

export function loadIbkrModule(container: Container): void {
	container.bind(IbkrExtractService).toResolvedValue(() => new IbkrExtractService()).inSingletonScope();
	container.bind(IbkrTransformService).toResolvedValue(() => new IbkrTransformService()).inSingletonScope();

	container.bind(IbkrBrokerageExportProvider).toResolvedValue(
		(extract: IbkrExtractService, transform: IbkrTransformService) => new IbkrBrokerageExportProvider(extract, transform),
		[IbkrExtractService, IbkrTransformService],
	).inSingletonScope();
}
