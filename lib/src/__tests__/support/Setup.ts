import { DateTime, Settings } from "luxon";

// Runs before every test file. Report CSVs carry UTC offsets and DIV's self-report flag reads the
// clock, so the zone and "now" every expected report file was generated under are pinned.
Settings.defaultZone = "Europe/Ljubljana";
const now = DateTime.fromISO("2026-03-01T12:00:00Z").toMillis();
Settings.now = () => now;
