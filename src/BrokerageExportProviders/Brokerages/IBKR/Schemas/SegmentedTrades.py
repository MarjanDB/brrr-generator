import BrokerageExportProviders.Brokerages.IBKR.Schemas.Schemas as s
import BrokerageExportProviders.Contracts.CommonBrokerageEvents as cbe


class SegmentedTrades(
    cbe.CommonBrokerageEvents[s.TransactionCash, s.CorporateAction, s.TradeStock, s.LotStock, s.TradeDerivative, s.LotDerivative]
): ...
