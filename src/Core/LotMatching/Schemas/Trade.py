from dataclasses import dataclass

from arrow import Arrow


@dataclass
class Trade:
    ID: str
    Quantity: float
    Date: Arrow
