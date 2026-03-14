import type { TaxAuthorityConfiguration, TaxPayerInfo } from "@brrr/TaxAuthorities/ConfigurationProvider";
import type { EDavkiDividendReportLine } from "@brrr/TaxAuthorities/Slovenia/Schemas/Schemas";
import { XMLBuilder } from "fast-xml-parser";

export function generateXmlReport(
	reportConfig: TaxAuthorityConfiguration,
	userConfig: TaxPayerInfo,
	selfReport: boolean,
	divLines: EDavkiDividendReportLine[],
): string {
	const edp = "http://edavki.durs.si/Documents/Schemas/EDP-Common-1.xsd";

	const dividendNodes = divLines.map((line) => ({
		Date: line.dateReceived.toFormat("yyyy-MM-dd"),
		PayerTaxNumber: line.taxNumberForDividendPayer,
		PayerIdentificationNumber: line.dividendPayerIdentificationNumber,
		PayerName: line.dividendPayerTitle,
		PayerAddress: line.dividendPayerAddress ?? "",
		PayerCountry: line.dividendPayerCountryOfOrigin,
		Type: line.dividendType,
		Value: String(line.dividendAmount),
		ForeignTax: String(line.foreignTaxPaid),
		SourceCountry: line.countryOfOrigin,
		ReliefStatement: line.taxReliefParagraphInInternationalTreaty ?? "",
	}));

	const tree = {
		"?xml": { "@_version": "1.0", "@_encoding": "UTF-8" },
		Envelope: {
			"@_xmlns:edp": edp,
			"@_xmlns:xs": "http://www.w3.org/2001/XMLSchema",
			"@_xmlns": "http://edavki.durs.si/Documents/Schemas/Doh_Div_3.xsd",
			"edp:Header": {
				"edp:taxpayer": {
					"edp:taxNumber": userConfig.taxNumber,
					"edp:taxpayerType": userConfig.taxpayerType,
					"edp:name": userConfig.name,
					"edp:address1": userConfig.address1,
					"edp:address2": userConfig.address2 ?? "",
					"edp:city": userConfig.city,
					"edp:postNumber": userConfig.postNumber,
					"edp:postName": userConfig.postName,
				},
				"edp:Workflow": {
					"edp:DocumentWorkflowID": "O",
				},
			},
			"edp:AttachmentList": {},
			"edp:Signatures": {},
			body: {
				Doh_Div: {
					Period: reportConfig.fromDate.toFormat("yyyy"),
					EmailAddress: "email",
					PhoneNumber: "telefonska",
					ResidentCountry: userConfig.countryId,
					IsResident: String(userConfig.countryId === "SI").toLowerCase(),
					SelfReport: String(selfReport).toLowerCase(),
				},
				Dividend: dividendNodes,
			},
		},
	};

	const builder = new XMLBuilder({
		ignoreAttributes: false,
		attributeNamePrefix: "@_",
		format: true,
		suppressEmptyNode: false,
	});

	return builder.build(tree) as string;
}
