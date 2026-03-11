import { loadIbkrModule } from "@brrr/Brokerages/Ibkr/IbkrModule.ts";
import type { Container } from "inversify";

export function loadBrokeragesModule(container: Container): void {
	loadIbkrModule(container);
}
