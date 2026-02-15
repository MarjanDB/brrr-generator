from dataclasses import dataclass
from typing import Sequence

from Core.StagingFinancialEvents.Schemas.Grouping import StagingFinancialGrouping
from Core.StagingFinancialEvents.Schemas.IdentifierRelationship import StagingIdentifierRelationships


@dataclass
class StagingFinancialEvents:
    """Broker-agnostic output of transform: staging groupings and identifier relationships.

    Returned by transformBrokerEventsToBrokerAgnosticEvents; groupings are passed to
    StagingFinancialGroupingProcessor; relationships can be converted to core and used later.
    """

    Groupings: Sequence[StagingFinancialGrouping]
    IdentifierRelationships: StagingIdentifierRelationships
