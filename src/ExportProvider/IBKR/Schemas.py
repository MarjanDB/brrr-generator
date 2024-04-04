from dataclasses import dataclass
from enum import Enum
from arrow import Arrow

class AssetClass(str, Enum):
    STOCK = "STK"
    CASH = "CASH"
    OPTION = "OPT"

class SubCategory(str, Enum):
    NONE = ""   # CASH AssetClass
    COMMON = "COMMON" # https://www.investopedia.com/terms/c/commonstock.asp
    PREFERRED = "PREFERRED" # Superior common stock -> https://www.investopedia.com/terms/p/preferredstock.asp
    RIGHT = "RIGHT" # Right to newly issued shares -> https://www.investopedia.com/terms/r/rightsoffering.asp
    ADR = "ADR" # American Depositary Receipt -> https://www.investopedia.com/terms/a/adr.asp
    ROYALTY_RUST = "ROYALTY TRST" # Royalty Income Trust -> https://www.investopedia.com/terms/r/royaltyincometrust.asp
    ETF = "ETF" # Exchange Traded Fund -> https://www.investopedia.com/terms/e/etf.asp

class OpenCloseIndicator(str, Enum):
    OPEN = "O"
    CLOSE = "C"

class TransactionType(str, Enum):
    EXCHANGE_TRADE = "ExchTrade"

class SecurityIDType(str, Enum):
    ISIN = "ISIN"

class BuyOrSell(str, Enum):
    BUY = "BUY"
    SELL = "SELL"

class PutOrCall(str, Enum):
    PUT = "P"
    CALL = "C"

# You can find these when generating standard statements under Performance & Reports > Statements
# They're redefined here for type completion and so they're readable in code
class Codes(str, Enum):
    ASSIGNMENT = "A"
    ADR_FEE_ACCRUAL = "ADR"
    AUTOMATIC_EXERCISE_FOR_DIVIDEND_RELATED_RECOMMENDATION = "AEx"
    AUTOFX_CONVERSION__RESULTING_FROM_TRADING = "AFx"
    ADJUSTMENT = "Adj"
    ALLOCATION = "Al"
    AWAY_TRADE = "Aw"
    AUTOMATIC_BUY_IN = "B"
    DIRECT_BORROW = "Bo"
    CLOSING_TRADE = "C"
    CASH_DELIVERY = "CD"
    COMPLEX_POSITION = "CP"
    CANCELLED = "Ca"
    CORRECTED_TRADE = "Co"
    PART_OR_ALL_OF_TRANSACTION_WAS_CROSSING_EXECUTED_AS_DUAL_AGENT_BY_IB_FOR_TWO_IB_CUSTOMERS = "Cx"
    ETF_CREATION_REDEMPTION = "ETF"
    RESULTED_FROM_AN_EXPIRED_POSITION = "Ep"
    EXERCISE = "Ex"
    IB_ACTED_AS_AGENT_FOR_FRACTIONAL_SHARE_PORTION_OF_TRADE_EXECUTED_BY_AN_IB_AFFILIATE_AS_PRINCIPAL = "FP"
    IB_ACTED_AS_AGENT_FOR_FRACTIONAL_AND_WHOLE_SHARE_PORTION_TRADE_WHERE_FRACTIONAL_WAS_EXECUTED_BY_AN_IB_AFFILIATE_AS_PRINCIPAL = "FPA"
    TRADE_IN_GUARANTEED_ACCOUNT_SEGMENT = "G"
    EXERCISE_OR_ASSIGNMENT_RESULTING_FROM_OFFSETTING_POSITIONS = "GEA"
    HIGHEST_COST_TAX_BASIS_ELECTION = "HC"
    INVESTMENT_TRANSFERRED_TO_HEDGE_FUND = "HFI"
    REDEMPTION_FROM_HEDGE_FUND = "HFI"
    INTERNAL_TRANSFER = "I"
    TRANSACTION_EXECUTED_AGAINST_IB_OR_AN_AFFILIATE = "IA"
    A_PORTION_OF_THE_ORDER_WAS_EXECUTED_AGAINST_IB_OR_AN_AFFILIATE_AND_IB_ACTED_AS_AGENT_ON_A_PORTION = "IM"
    INVESTMENT_TRANSFER_FROM_INVESTOR = "INV"
    THE_TRANSACTION_WAS_EXECUTED_AS_PART_OF_AN_IPO_IN_WHICH_IB_WAS_A_MEMBER_OF_THE_SELLING_GROUP_AND_IS_CLASSIFIED_AS_A_PRINCIPAL_TRADE = "IPO"
    ORDER_BY_IB_BECAUSE_OF_MARGIN_VIOLATION = "L"
    ADJUSTED_BY_LOSS_DISALLOWED_FROM_WASH_SALE = "LD"
    LAST_IN_FIRST_OUT_LIFO_TAX_BASIS_ELECTION = "LI"
    LONG_TERM_PL = "LT"
    DIRECT_LOAN = "Lo"
    ENTERED_MANUALLY_BY_IB = "M"
    MANUAL_EXERCISE_FOR_DIVIDEND_RELATED_RECOMMENDATION = "MEx"
    MAXIMIZE_LOSSES_TAX_BASIS_ELECTION = "ML"
    MAXIMIZE_LONG_TERM_GAIN_TAX_BASIS_ELECTION = "MLG"
    MAXIMIZE_LONG_TERM_LOSS_TAX_BASIS_ELECTION = "MLL"
    MAXIMIZE_SHORT_TERM_GAIN_TAX_BASIS_ELECTION = "MSG"
    MAXIMIZE_SHORT_TERM_LOSS_TAX_BASIS_ELECTION = "MSL"
    OPENING_TRADE = "O"
    PARTIAL_EXECUTION = "P"
    PERPETUAL_INVESTMENT = "PE"
    PRICE_IMPROVEMENT = "PI"
    INTEREST_OR_DIVIDEND_ACCRUAL_POSTING = "Po"
    PART_OR_ALL_OF_TRANSACTION_WAS_EXECUTED_BY_EXCHANGE_AS_CROSSING_BY_IB_AGAINST_AN_IB_AFFILIATE_AND_IS_CLASSIFIED_AS_PRINCIAL_AND_NOT_AN_AGENCY_TRADE = "Pr"
    DIVIDEND_REINVESTMENT = "R"
    REDEPTION_TO_INVESTOR = "RED"
    RECURRING_INVESTMENT = "RI"
    IB_ACTED_AS_AGENT_FOR_FRACTIONAL_SHARE_PORTION_OF_TRADE_EXECUTED_BY_AN_IB_AFFILIATE_AS_RISKLESS_PRINCIPAL = "RP"
    IB_ACTED_AS_AGENT_FOR_FRACTIONAL_AND_WHOLE_SHARE_PORTION_TRADE_WHERE_FRACTIONAL_WAS_EXECUTED_BY_AN_IB_AFFILIATE_AS_RISKLESS_PRINCIPAL = "RPA"
    REBILL = "Rb"
    INTEREST_OR_DIVIDEND_ACCRUAL_REVERSAL = "Re"
    REIMBURSEMENT = "Ri"
    TRADE_SUBJECT_TO_IBKR_LITE_SUPERCHAGE_FEE_IF_TRADE_EXCEEDS_10_PERCENT_OF_TOTAL_MONTHLY_LITE_TRADE_VOLUME = "SF"
    THIS_ORDER_WAS_SOLICITED_BY_INTERACTIVE_BROKERS = "SI"
    SPECIFIC_LOT_TAX_BASIS_ELECTION = "SL"
    THIS_ORDER_WAS_MARKED_AS_SOLICITED_BY_YOUR_INTRODUCING_BROKER = "SO"
    CUSTOMER_DESIGNATED_TRADE_FOR_SHORTENED_SETTLEMENT_AND_IS_SUBJECT_TO_EXECUTION_AT_PRICES_ABOVE_THE_PREVALING_MARKET = "SS"
    SHORT_TERM_PL = "ST"
    TRANSFER = "T"
    UNVESTED_SHARED_FROM_STOCK_GRANT = "Un"
    MUTUAL_FUND_EXCHANGE_TRANSACTION = "XCH"

class LevelOfDetail(str, Enum):
    EXECUTION = "EXECUTION"
    DETAIL = "DETAIL"
    CLOSED_LOT = "CLOSED_LOT"

class OrderType(str, Enum):
    LIMIT = "LMT"
    MARKET = "MKT"
    MID_POINT = "MIDPX"

class Model(str, Enum):
    INDEPENDENT = "Independent"



class CashTransactionType(str, Enum):
    WITHOLDING_TAX = "Withholding Tax"
    DIVIDEND = "Dividends"



@dataclass
class TradeGeneric:
    """
        Generic class for copy paste when making new Trade/Lot Types
    """
    ClientAccountID: str
    AccountAlias: str | None
    Model: Model | None
    Currency: str
    FXRateToBase: float
    AssetClass: AssetClass
    SubCategory: SubCategory
    Symbol: str
    Description: str
    Conid: str
    SecurityID: str
    SecurityIDType: SecurityIDType
    CUSIP: str | None
    ISIN: str
    FIGI: str | None
    ListingExchange: str
    UnderlyingConid: str | None
    UnderlyingSymbol: str | None
    UnderlyingSecurityID: str | None
    UnderlyingListingExchange: str | None
    Issuer: str | None
    IssuerCountryCode: str | None
    TradeID: str | None
    Multiplier: float
    RelatedTradeID: str | None
    Strike: float | None
    ReportDate: Arrow
    Expiry: Arrow | None
    DateTime: Arrow
    PutOrCall: str | None
    TradeDate: Arrow
    PrincipalAdjustFactor: float | None
    SettleDateTarget: Arrow | None
    TransactionType: TransactionType | None
    Exchange: str | None
    Quantity: float
    TradePrice: float
    TradeMoney: float | None
    Proceeds: float | None
    Taxes: float | None
    IBCommission: float | None
    IBCommissionCurrency: str | None
    NetCash: float | None
    NetCashInBase: float | None
    ClosePrice: float | None
    OpenCloseIndicator: OpenCloseIndicator
    NotesAndCodes: list[Codes]
    CostBasis: float
    FifoProfitAndLossRealized: float
    CapitalGainsProfitAndLoss: float
    ForexProfitAndLoss: float
    MarketToMarketProfitAndLoss: float | None
    OrigTradePrice: float | None
    OrigTradeDate: Arrow | None
    OrigTradeID: str | None
    OrigOrderID: str | None
    OrigTransactionID: str | None
    BuyOrSell: BuyOrSell
    ClearingFirmID: str | None
    IBOrderID: str | None
    TransactionID: str
    IBExecID: str | None
    RelatedTransactionID: str | None
    BrokerageOrderID: str | None
    OrderReference: str | None
    VolatilityOrderLink: str | None
    ExchOrderID: str | None
    ExtExecID: str | None
    OrderTime: Arrow | None
    OpenDateTime: Arrow | None
    HoldingPeriodDateTime: Arrow | None
    WhenRealized: Arrow | None
    WhenReopened: Arrow | None
    LevelOfDetail: LevelOfDetail
    ChangeInPrice: float | None
    ChangeInQuantity: float | None
    OrderType: OrderType | None
    TraderID: str | None
    IsAPIOrder: bool | None
    AccruedInterest: float | None
    SerialNumber: str | None
    DeliveryType: str  | None # enum
    CommodityType: str  | None # enum
    Fineness: float
    Weight: float


@dataclass
class TransactionCash:
    ClientAccountID: str
    Currency: str
    FXRateToBase: float
    AssetClass: AssetClass
    SubCategory: SubCategory
    Symbol: str
    Description: str
    Conid: str
    SecurityID: str
    SecurityIDType: SecurityIDType
    CUSIP: str | None
    ISIN: str
    FIGI: str | None
    ListingExchange: str
    DateTime: Arrow
    SettleDate: Arrow
    Amount: float
    Type: CashTransactionType
    Code: str | None
    TransactionID: str
    ReportDate: Arrow
    ActionID: str


@dataclass
class TradeStock:
    ClientAccountID: str
    Currency: str
    FXRateToBase: float
    AssetClass: AssetClass
    SubCategory: SubCategory
    Symbol: str
    Description: str
    Conid: str
    SecurityID: str
    SecurityIDType: SecurityIDType
    CUSIP: str | None
    ISIN: str
    FIGI: str | None
    ListingExchange: str
    ReportDate: Arrow
    DateTime: Arrow
    TradeDate: Arrow
    TransactionType: TransactionType
    Exchange: str
    Quantity: float
    TradePrice: float
    TradeMoney: float
    Proceeds: float
    Taxes: float
    IBCommission: float
    IBCommissionCurrency: str
    NetCash: float
    NetCashInBase: float
    ClosePrice: float
    OpenCloseIndicator: OpenCloseIndicator
    NotesAndCodes: list[Codes]
    CostBasis: float
    FifoProfitAndLossRealized: float
    CapitalGainsProfitAndLoss: float
    ForexProfitAndLoss: float
    MarketToMarketProfitAndLoss: float
    BuyOrSell: BuyOrSell
    TransactionID: str
    OrderTime: Arrow 
    LevelOfDetail: LevelOfDetail
    ChangeInPrice: float
    ChangeInQuantity: float
    OrderType: OrderType
    AccruedInterest: float


@dataclass
class LotStock:
    ClientAccountID: str
    Currency: str
    FXRateToBase: float
    AssetClass: AssetClass
    SubCategory: SubCategory
    Symbol: str
    Description: str
    Conid: str
    SecurityID: str
    SecurityIDType: SecurityIDType
    CUSIP: str | None
    ISIN: str
    FIGI: str | None
    ListingExchange: str
    Multiplier: float
    ReportDate: Arrow
    DateTime: Arrow
    TradeDate: Arrow
    Exchange: str
    Quantity: float
    TradePrice: float
    OpenCloseIndicator: OpenCloseIndicator
    NotesAndCodes: list[Codes]
    CostBasis: float
    FifoProfitAndLossRealized: float
    CapitalGainsProfitAndLoss: float
    ForexProfitAndLoss: float
    BuyOrSell: BuyOrSell
    TransactionID: str
    OpenDateTime: Arrow
    HoldingPeriodDateTime: Arrow
    LevelOfDetail: LevelOfDetail


@dataclass
class TradeDerivative:
    ClientAccountID: str
    Currency: str
    FXRateToBase: float
    AssetClass: AssetClass
    SubCategory: SubCategory
    Symbol: str
    Description: str
    Conid: str
    FIGI: str | None
    ListingExchange: str
    UnderlyingConid: str
    UnderlyingSymbol: str
    UnderlyingSecurityID: str
    UnderlyingListingExchange: str
    TradeID: str
    Multiplier: float
    Strike: float
    ReportDate: Arrow
    Expiry: Arrow
    DateTime: Arrow
    PutOrCall: PutOrCall
    TradeDate: Arrow
    SettleDateTarget: Arrow
    TransactionType: TransactionType
    Exchange: str
    Quantity: float
    TradePrice: float
    TradeMoney: float
    Proceeds: float
    Taxes: float 
    IBCommission: float
    IBCommissionCurrency: str
    NetCash: float
    NetCashInBase: float
    ClosePrice: float
    OpenCloseIndicator: OpenCloseIndicator
    NotesAndCodes: list[Codes]
    CostBasis: float
    FifoProfitAndLossRealized: float
    CapitalGainsProfitAndLoss: float
    ForexProfitAndLoss: float
    MarketToMarketProfitAndLoss: float | None
    BuyOrSell: BuyOrSell
    TransactionID: str
    OrderTime: Arrow
    LevelOfDetail: LevelOfDetail
    OrderType: OrderType


@dataclass
class LotDerivative:
    ClientAccountID: str
    Currency: str
    FXRateToBase: float
    AssetClass: AssetClass
    SubCategory: SubCategory
    Symbol: str
    Description: str
    Conid: str
    FIGI: str | None
    ListingExchange: str
    UnderlyingConid: str
    UnderlyingSymbol: str
    UnderlyingSecurityID: str
    UnderlyingListingExchange: str
    Multiplier: float
    Strike: float
    ReportDate: Arrow
    Expiry: Arrow
    DateTime: Arrow
    PutOrCall: PutOrCall
    TradeDate: Arrow
    Exchange: str
    Quantity: float
    TradePrice: float
    OpenCloseIndicator: OpenCloseIndicator
    NotesAndCodes: list[Codes]
    CostBasis: float
    FifoProfitAndLossRealized: float
    CapitalGainsProfitAndLoss: float
    ForexProfitAndLoss: float
    BuyOrSell: BuyOrSell
    TransactionID: str
    OpenDateTime: Arrow
    HoldingPeriodDateTime: Arrow
    LevelOfDetail: LevelOfDetail




@dataclass
class SegmentedTrades:
    # cashTrades: list[TransactionCash]
    cashTransactions: list[TransactionCash]

    stockTrades: list[TradeStock]
    stockLots: list[LotStock]

    derivativeTrades: list[TradeDerivative]
    derivativeLots: list[LotDerivative]

