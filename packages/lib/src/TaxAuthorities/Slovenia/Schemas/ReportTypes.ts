export enum SlovenianTaxAuthorityReportTypes {
	DOH_DIV = "Dividende",
	DOH_KDVP = "Vrednostni papirji",
	D_IFI = "Izvedeni finančni inštrumenti",
}

// The IDs the site and the CLI use to ask for a report.
export enum SlovenianReportTypeId {
	KDVP = "kdvp",
	DIV = "div",
	IFI = "ifi",
}

// https://edavki.durs.si/EdavkiPortal/PersonalPortal/[360253]/Pages/Help/sl/WorkflowType1.htm
export enum EDavkiDocumentWorkflowType {
	ORIGINAL = "O",
	SETTLEMENT_ZDAVP2_NO_CLAUSE = "B",
	SETTLEMENT_ZDAVP2_WITH_CLAUSE = "R",
	CORRECTION_WITHIN_30_DAYS_ZDAVP2 = "P",
	SELF_REPORT = "I",
	CORRECTION_WITH_INCREASED_LIABILITIES = "V",
	CORRECTION_WITHIN_12_MONTHS_ZDAVP2 = "Z",
	CANCELLED = "S",
}
