import type { ValidDateTime } from "@brrr/Utils/DateTime";

export type Trade = {
	id: string;
	quantity: number;
	date: ValidDateTime;
};
