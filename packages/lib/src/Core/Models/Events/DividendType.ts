// ISO 15022/20022 corporate action event codes (CAEV), with the dividend type qualifier where it
// tells them apart.
export enum DividendType {
	UNKNOWN = "UNKNOWN",
	ORDINARY = "ORDINARY", // DVCA, DIVI//REGR
	BONUS = "BONUS", // DVCA, DIVI//SPEC
	LIQUIDATING = "LIQUIDATING", // LIQU
	OTHER = "OTHER",
}
