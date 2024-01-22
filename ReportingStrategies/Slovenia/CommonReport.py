from enum import Enum
from lxml import etree
from arrow import Arrow
from dataclasses import dataclass

class TaxPayerType(str, Enum):
    PHYSICAL_SUBJECT = "FO"
    LAW_SUBJECT = "PO"
    PHYSICAL_SUBJECT_WITH_ACTIVITY = "SP"


@dataclass
class TaxPayerInfo:
    taxNumber: str
    taxpayerType: TaxPayerType
    name: str
    address1: str
    address2: str | None
    city: str
    postNumber: str
    postName: str
    municipalityName: str
    birthDate: Arrow
    maticnaStevilka: str
    invalidskoPodjetje: bool
    resident: bool
    activityCode: str
    activityName: str
    countryID: str
    countryName: str



class CommonReport:
    taxPayerInfo: TaxPayerInfo

    def __init__(self, taxPayerInfo: TaxPayerInfo):
        self.taxPayerInfo = taxPayerInfo


    def createReportEnvelope(self):
        edp = "http://edavki.durs.si/Documents/Schemas/EDP-Common-1.xsd"

        nsmap = {
            # None: "http://edavki.durs.si/Documents/Schemas/Doh_Div_3.xsd",
            "edp": edp,
            "xs": "http://www.w3.org/2001/XMLSchema"
        }

        Envelope = etree.Element("Envelope", {}, nsmap=nsmap)

        Header = etree.SubElement(Envelope,  etree.QName(edp, "Header"))
        Taxpayer = etree.SubElement(Header, etree.QName(edp, "taxpayer"))
        etree.SubElement(Taxpayer, etree.QName(edp, "taxNumber")).text = self.taxPayerInfo.taxNumber
        etree.SubElement(Taxpayer, etree.QName(edp, "taxpayerType")).text = self.taxPayerInfo.taxpayerType.value # "FO" see EDP-Common-1 schema
        etree.SubElement(Taxpayer, etree.QName(edp, "name")).text = self.taxPayerInfo.name
        etree.SubElement(Taxpayer, etree.QName(edp, "address1")).text = self.taxPayerInfo.address1
        etree.SubElement(Taxpayer, etree.QName(edp, "address2")).text = self.taxPayerInfo.address2 if self.taxPayerInfo.address2 else ""
        etree.SubElement(Taxpayer, etree.QName(edp, "city")).text = self.taxPayerInfo.city
        etree.SubElement(Taxpayer, etree.QName(edp, "postNumber")).text = self.taxPayerInfo.postNumber
        etree.SubElement(Taxpayer, etree.QName(edp, "postName")).text = self.taxPayerInfo.postName
        etree.SubElement(Envelope, etree.QName(edp, "AttachmentList"))
        etree.SubElement(Envelope, etree.QName(edp, "Signatures"))

        workflow = etree.SubElement(Header, etree.QName(edp, "Workflow"))
        etree.SubElement(workflow, etree.QName(edp, "DocumentWorkflowID")).text = "O" # https://edavki.durs.si/EdavkiPortal/PersonalPortal/[360253]/Pages/Help/sl/WorkflowType1.htm

        
        return Envelope