import type { TradeEvent } from "@brrr/core/schemas/Events.ts";
import type { DateTime } from "luxon";

export class ProcessingUtils {
	findEventById<T extends TradeEvent>(id: string, events: T[]): T {
		const found = events.find((e) => e.id === id);
		if (!found) throw new Error(`No event found with id: ${id}`);
		return found;
	}

	findEventByDate<T extends TradeEvent>(date: DateTime, events: T[]): T[] {
		return events.filter((e) => e.date.toMillis() === date.toMillis());
	}
}
