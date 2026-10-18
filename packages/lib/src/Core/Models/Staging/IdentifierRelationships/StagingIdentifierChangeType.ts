// ISO 15022/20022 corporate action event codes (CAEV).
export enum StagingIdentifierChangeType {
	RENAME = "RENAME", // CHAN
	SPLIT = "SPLIT", // SPLF
	REVERSE_SPLIT = "REVERSE_SPLIT", // SPLR
	UNKNOWN = "UNKNOWN",
}
