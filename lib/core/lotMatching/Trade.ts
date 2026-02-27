import type { DateTime } from "luxon";

export type Trade = {
  id: string;
  quantity: number;
  date: DateTime;
};
