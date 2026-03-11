import { IbkrExtractService } from "@brrr/Brokerages/Ibkr/Extract.ts";
import { IbkrBrokerageExportProvider } from "@brrr/Brokerages/Ibkr/IbkrBrokerageExportProvider.ts";
import { IbkrTransformService } from "@brrr/Brokerages/Ibkr/Transform.ts";
import type { Container } from "inversify";

export function loadIbkrModule(container: Container): void {
	container.bind(IbkrExtractService).toResolvedValue(() => new IbkrExtractService()).inSingletonScope();
	container.bind(IbkrTransformService).toResolvedValue(() => new IbkrTransformService()).inSingletonScope();

	container.bind(IbkrBrokerageExportProvider).toResolvedValue(
		(extract: IbkrExtractService, transform: IbkrTransformService) => new IbkrBrokerageExportProvider(extract, transform),
		[IbkrExtractService, IbkrTransformService],
	).inSingletonScope();
}
