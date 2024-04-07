import src.BrokerageExportProviders.Brokerages.IBKR.Schemas.Schemas as s
import src.BrokerageExportProviders.Contracts.CommonBrokerageEvents as cbe


class SegmentedTrades(
    cbe.CommonBrokerageEvents[s.TransactionCash, s.CorporateAction, s.TradeStock, s.LotStock, s.TradeDerivative, s.LotDerivative]
): ...
