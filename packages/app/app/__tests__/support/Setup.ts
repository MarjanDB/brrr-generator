import { Settings } from "luxon";

// Runs before every test file. Report CSVs carry UTC offsets, so tests that compare a report with a
// test case's expected file run in the zone every expected file was generated in, as lib's do.
Settings.defaultZone = "Europe/Ljubljana";
