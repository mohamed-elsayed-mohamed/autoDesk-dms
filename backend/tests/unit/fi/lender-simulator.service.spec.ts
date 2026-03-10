import Decimal from 'decimal.js';
import { LenderSimulatorService } from '../../../src/modules/fi/lender-submissions/lender-simulator.service';
import { LenderDecision } from '@prisma/client';

describe('LenderSimulatorService', () => {
  let service: LenderSimulatorService;

  beforeEach(() => {
    service = new LenderSimulatorService();
  });

  describe('simulateDecision determinism', () => {
    it('same (dealId, lenderId) always returns identical decision', () => {
      const dealId = 'deal-abc-123';
      const lenderId = 'lender-xyz-456';
      const amount = new Decimal('28000');

      const result1 = service.simulateDecision(dealId, lenderId, amount);
      const result2 = service.simulateDecision(dealId, lenderId, amount);
      const result3 = service.simulateDecision(dealId, lenderId, amount);

      expect(result1.decision).toBe(result2.decision);
      expect(result2.decision).toBe(result3.decision);
      expect(result1.buyRate?.toString()).toBe(result2.buyRate?.toString());
    });

    it('different lenderIds for same deal produce different decisions across 15 lenders', () => {
      const dealId = 'test-deal-id';
      const amount = new Decimal('25000');
      const decisions = new Set<string>();

      for (let i = 0; i < 15; i++) {
        const result = service.simulateDecision(dealId, `lender-${i}`, amount);
        decisions.add(result.decision);
      }

      // Across 15 lenders we should see at least 2 of 3 decision types
      expect(decisions.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Approved decision', () => {
    it('Approved response has non-null buyRate in range 4.50–8.90%', () => {
      // Find a combo that produces Approved
      let approvedResult: ReturnType<typeof service.simulateDecision> | null = null;
      for (let i = 0; i < 30; i++) {
        const result = service.simulateDecision(`deal-${i}`, 'lender-1', new Decimal('20000'));
        if (result.decision === LenderDecision.Approved) {
          approvedResult = result;
          break;
        }
      }

      if (approvedResult) {
        expect(approvedResult.buyRate).not.toBeNull();
        const rate = approvedResult.buyRate!.toNumber();
        expect(rate).toBeGreaterThanOrEqual(4.50);
        expect(rate).toBeLessThanOrEqual(8.90);
        expect(approvedResult.approvedAmount).not.toBeNull();
        expect(approvedResult.maxTerm).toBe(72);
        expect(approvedResult.stipulations).toBeNull();
      }
    });
  });

  describe('Declined decision', () => {
    it('Declined responses have null buyRate, approvedAmount, and maxTerm', () => {
      // Find a combo that produces Declined
      let declinedResult: ReturnType<typeof service.simulateDecision> | null = null;
      for (let i = 0; i < 30; i++) {
        const result = service.simulateDecision(`deal-${i}`, 'lender-2', new Decimal('20000'));
        if (result.decision === LenderDecision.Declined) {
          declinedResult = result;
          break;
        }
      }

      if (declinedResult) {
        expect(declinedResult.buyRate).toBeNull();
        expect(declinedResult.approvedAmount).toBeNull();
        expect(declinedResult.maxTerm).toBeNull();
      }
    });
  });

  describe('Conditional decision', () => {
    it('Conditional responses have stipulations text', () => {
      let conditionalResult: ReturnType<typeof service.simulateDecision> | null = null;
      for (let i = 0; i < 30; i++) {
        const result = service.simulateDecision(`deal-${i}`, 'lender-3', new Decimal('20000'));
        if (result.decision === LenderDecision.Conditional) {
          conditionalResult = result;
          break;
        }
      }

      if (conditionalResult) {
        expect(conditionalResult.stipulations).toBeTruthy();
        expect(conditionalResult.buyRate).not.toBeNull();
        expect(conditionalResult.maxTerm).toBe(60);
      }
    });
  });
});
