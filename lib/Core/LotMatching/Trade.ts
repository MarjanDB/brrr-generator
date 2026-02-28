import type { ValidDateTime } from "@brrr/Utils/DateTime.ts";

export type Trade = {
	id: string;
	quantity: number;
	date: ValidDateTime;
};
