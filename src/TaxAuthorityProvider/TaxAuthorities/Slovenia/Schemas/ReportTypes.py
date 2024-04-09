from enum import Enum


class SlovenianTaxAuthorityReportTypes(str, Enum):
    DOH_DIV = "Dividende"
    DOH_KDVP = "Vrednostni papirji"
    D_IFI = "Izvedeni finančni inštrumenti"
    DOH_OBR = "Obresti"


# https://edavki.durs.si/EdavkiPortal/PersonalPortal/[360253]/Pages/Help/sl/WorkflowType1.htm
class EDavkiDocumentWorkflowType(str, Enum):
    ORIGINAL = "O"
    SETTLEMENT_ZDAVP2_NO_CLAUSE = "B"
    SETTLEMENT_ZDAVP2_WITH_CLAUSE = "R"
    CORRECTION_WITHIN_30_DAYS_ZDAVP2 = "P"
    SELF_REPORT = "I"
    CORRECTION_WITH_INCREASED_LIABILITIES = "V"
    CORRECTION_WITHIN_12_MONTHS_ZDAVP2 = "Z"
    CANCELLED = "S"
