import Core.StagingFinancialEvents.Schemas.FinancialIdentifier as sfi


class TestStagingFinancialIdentifier:
    def test_strict_equality_same_triple(self) -> None:
        a = sfi.StagingFinancialIdentifier(ISIN="US123", Ticker="AAPL", Name="Apple")
        b = sfi.StagingFinancialIdentifier(ISIN="US123", Ticker="AAPL", Name="Apple")
        assert a == b
        assert hash(a) == hash(b)

    def test_strict_equality_different_isin_same_ticker_name_not_equal(self) -> None:
        a = sfi.StagingFinancialIdentifier(ISIN="US7731221062", Ticker="RKLB", Name="ROCKET LAB CORP")
        b = sfi.StagingFinancialIdentifier(ISIN="US7731211089", Ticker="RKLB", Name="ROCKET LAB CORP")
        assert a != b
        assert hash(a) != hash(b)

    def test_hash_equals_when_identifiers_equal(self) -> None:
        a = sfi.StagingFinancialIdentifier(ISIN="US123", Ticker="X", Name="Y")
        b = sfi.StagingFinancialIdentifier(ISIN="US123", Ticker="X", Name="Y")
        assert a == b
        assert hash(a) == hash(b)

    def test_none_fields_strict_match(self) -> None:
        # Same ticker matches when no name conflict (ISIN can be missing; look up later).
        a = sfi.StagingFinancialIdentifier(ISIN=None, Ticker="T", Name=None)
        b = sfi.StagingFinancialIdentifier(ISIN=None, Ticker="T", Name=None)
        assert a == b
        # Do not match when Name differs.
        a2 = sfi.StagingFinancialIdentifier(ISIN=None, Ticker="T", Name="N")
        assert a != a2
