import type { Trade } from "./Trade.ts";

export type TradeAssociation = {
  quantity: number;
  associatedTrade: Trade;
};

export class TradeAssociationTracker {
  private tradeAcquiredTracker: Map<string, TradeAssociation> = new Map();
  private tradeSoldTracker: Map<string, TradeAssociation> = new Map();

  private associateAcquiredTrade(event: Trade): void {
    if (!this.tradeAcquiredTracker.has(event.id)) {
      this.tradeAcquiredTracker.set(event.id, { quantity: 0, associatedTrade: event });
    }
  }

  private associateSoldTrade(event: Trade): void {
    if (!this.tradeSoldTracker.has(event.id)) {
      this.tradeSoldTracker.set(event.id, { quantity: 0, associatedTrade: event });
    }
  }

  trackTrade(event: Trade): void {
    if (event.quantity >= 0) {
      this.associateAcquiredTrade(event);
    } else {
      this.associateSoldTrade(event);
    }
  }

  trackAcquiredQuantity(event: Trade, quantity: number): void {
    this.associateAcquiredTrade(event);

    const tracker = this.tradeAcquiredTracker.get(event.id);
    if (tracker === undefined) {
      throw new Error(`There is no tracker for the event (${event.id})`);
    }

    if (tracker.quantity + quantity > event.quantity) {
      throw new Error(
        `Adding tracking quantity (${quantity}) to event (${event.id}) exceeds total quantity (${tracker.quantity + quantity} / ${event.quantity}) of the event`,
      );
    }

    tracker.quantity += quantity;
  }

  trackSoldQuantity(event: Trade, quantity: number): void {
    this.associateSoldTrade(event);

    const tracker = this.tradeSoldTracker.get(event.id);
    if (tracker === undefined) {
      throw new Error(`There is no tracker for the event (${event.id})`);
    }

    if (tracker.quantity + quantity > Math.abs(event.quantity)) {
      throw new Error(
        `Adding tracking quantity (${quantity}) to event (${event.id}) exceeds total quantity (${tracker.quantity + quantity} / ${Math.abs(event.quantity)}) of the event`,
      );
    }

    tracker.quantity += quantity;
  }

  getAcquiredTradeTracker(event: Trade): TradeAssociation {
    const tracker = this.tradeAcquiredTracker.get(event.id);
    if (tracker === undefined) {
      throw new Error(`Tracker for event (${event.id}) does not exist`);
    }
    return tracker;
  }

  getSoldTradeTracker(event: Trade): TradeAssociation {
    const tracker = this.tradeSoldTracker.get(event.id);
    if (tracker === undefined) {
      throw new Error(`Tracker for event (${event.id}) does not exist`);
    }
    return tracker;
  }
}
