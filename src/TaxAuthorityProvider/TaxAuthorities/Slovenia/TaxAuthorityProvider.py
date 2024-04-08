import src.ConfigurationProvider.Configuration as cpc
import src.TaxAuthorityProvider.Common.TaxAuthorityProvider as tap
import src.TaxAuthorityProvider.Schemas.Configuration as c
import src.TaxAuthorityProvider.TaxAuthorities.Slovenia.Schemas.ReportTypes as rt


class SlovenianTaxAuthorityProvider(
    tap.GenericTaxAuthorityProvider[c.TaxAuthorityConfiguration, cpc.TaxPayerInfo, rt.SlovenianTaxAuthorityReportTypes]
):

    def generateExportForTaxAuthority(self, reportType: TAX_AUTHORITY_REPORT, data: Sequence[gf.UnderlyingGrouping]) -> Any:
        """
        The reportType argument represents a report type to be generated.
        The data argument is the UnderlyingGrouping that the report can be generated off of.
        The return should be a structure that can be saved.
        TODO: Perhaps add a layer of indirection where a type of ReportWrapper is returned, which will wrap around whatever is being used to hold/store the data (lxml, pandas, ...).
        """

    def generateSpreadsheetExport(self, reportType: TAX_AUTHORITY_REPORT, data: Sequence[gf.UnderlyingGrouping]) -> pd.DataFrame:
        """
        The reportType argument represents a report type to be generated.
        The data argument is the UnderlyingGrouping that the report can be generated off of.
        The return should be a DataFrame that can be used for validating reports using a spreadsheet program.
        """
