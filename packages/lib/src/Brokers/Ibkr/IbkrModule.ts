import { IbkrExtractService } from "@brrr/Brokers/Ibkr/Extract";
import { IbkrBrokerExportProvider } from "@brrr/Brokers/Ibkr/IbkrBrokerExportProvider";
import { IbkrTransformService } from "@brrr/Brokers/Ibkr/Transform";
import type { Container } from "inversify";

export function loadIbkrModule(container: Container): void {
	container
		.bind(IbkrExtractService)
		.toResolvedValue(() => new IbkrExtractService())
		.inSingletonScope();
	container
		.bind(IbkrTransformService)
		.toResolvedValue(() => new IbkrTransformService())
		.inSingletonScope();

	container
		.bind(IbkrBrokerExportProvider)
		.toResolvedValue(
			(extract: IbkrExtractService, transform: IbkrTransformService) =>
				new IbkrBrokerExportProvider(extract, transform),
			[IbkrExtractService, IbkrTransformService],
		)
		.inSingletonScope();
}
