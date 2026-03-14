import type { TradeEvent } from "@brrr/Core/Schemas/Events";
import type { ValidDateTime } from "@brrr/Utils/DateTime";

export class ProcessingUtils {
	findEventById<T extends TradeEvent>(id: string, events: T[]): T {
		const found = events.find((e) => e.id === id);
		if (!found) throw new Error(`No event found with id: ${id}`);
		return found;
	}

	findEventByDate<T extends TradeEvent>(date: ValidDateTime, events: T[]): T[] {
		return events.filter((e) => e.date.toMillis() === date.toMillis());
	}
}
