import Core.FinancialEvents.Schemas.CommonFormats as cf
import Core.FinancialEvents.Schemas.FinancialIdentifier as cfi
import Core.FinancialEvents.Schemas.Grouping as pgf
from Core.FinancialEvents.Services.IdentifierRelationshipService import (
    IdentifierRelationshipService,
)


def test_compute_returns_same_groupings_and_empty_relationships() -> None:
    grouping = pgf.FinancialGrouping(
        FinancialIdentifier=cfi.FinancialIdentifier(ISIN="US123", Ticker="AAPL", Name="AAPL"),
        CountryOfOrigin="US",
        UnderlyingCategory=cf.GenericCategory.REGULAR,
        StockTrades=[],
        StockTaxLots=[],
        DerivativeGroupings=[],
        CashTransactions=[],
    )
    groupings: list[pgf.FinancialGrouping] = [grouping]
    service = IdentifierRelationshipService()
    result_groupings, identifier_relationships = service.compute(groupings)
    assert result_groupings is groupings
    assert list(identifier_relationships.Relationships) == []
