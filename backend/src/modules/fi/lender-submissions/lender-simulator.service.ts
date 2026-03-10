import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { LenderDecision } from '@prisma/client';

export interface LenderDecisionResult {
  decision: LenderDecision;
  approvedAmount: Decimal | null;
  buyRate: Decimal | null;
  maxTerm: number | null;
  stipulations: string | null;
}

@Injectable()
export class LenderSimulatorService {
  /**
   * Deterministic decision using djb2 hash of "${dealId}:${lenderId}".
   * bucket 0 = Approved, 1 = Conditional, 2 = Declined
   * Buy rate derived from same hash: 4.50 + (hash % 441) / 100 → 4.50–8.90%
   */
  simulateDecision(
    dealId: string,
    lenderId: string,
    amountFinanced: Decimal,
  ): LenderDecisionResult {
    const hash = this.djb2Hash(`${dealId}:${lenderId}`);
    const bucket = hash % 3;
    const buyRateCents = 450 + (hash % 441);
    const buyRate = new Decimal(buyRateCents).dividedBy(100);

    switch (bucket) {
      case 0:
        return {
          decision: LenderDecision.Approved,
          approvedAmount: amountFinanced,
          buyRate,
          maxTerm: 72,
          stipulations: null,
        };
      case 1:
        return {
          decision: LenderDecision.Conditional,
          approvedAmount: amountFinanced.times(new Decimal('0.90')),
          buyRate,
          maxTerm: 60,
          stipulations: 'Proof of income required',
        };
      default:
        return {
          decision: LenderDecision.Declined,
          approvedAmount: null,
          buyRate: null,
          maxTerm: null,
          stipulations: null,
        };
    }
  }

  private djb2Hash(str: string): number {
    let hash = 5381;
    for (const char of str) {
      hash = (hash << 5) + hash + char.charCodeAt(0);
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}
