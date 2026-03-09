import { DealCalculationService, CalculationInput, CalculationResult } from '../../../src/modules/deals/calculation/deal-calculation.service';
import { DealType } from '@prisma/client';

describe('DealCalculationService', () => {
  let service: DealCalculationService;

  beforeEach(() => {
    service = new DealCalculationService();
  });

  function baseInput(overrides: Partial<CalculationInput> = {}): CalculationInput {
    return {
      dealType: DealType.Finance,
      salePrice: 0,
      downPayment: 0,
      rebates: 0,
      apr: 0,
      term: 0,
      taxRate: 0,
      vehicleCost: 0,
      fees: [],
      tradeIn: null,
      ...overrides,
    };
  }

  describe('calculateTotalTax', () => {
    it('includes only taxable fees in tax base', () => {
      const result = service.recalculate(
        baseInput({
          salePrice: 30000,
          taxRate: 0.08,
          fees: [
            { amount: 799, taxable: true },
            { amount: 150, taxable: false },
          ],
        }),
      );
      // taxable base = 30000 + 799 = 30799; tax = 30799 * 0.08 = 2463.92
      expect(result.totalTax).toBeCloseTo(2463.92, 2);
    });

    it('returns zero tax when taxRate is 0', () => {
      const result = service.recalculate(baseInput({ salePrice: 30000, taxRate: 0 }));
      expect(result.totalTax).toBe(0);
    });
  });

  describe('calculateAmountFinanced', () => {
    it('computes full formula from spec acceptance scenario 2', () => {
      const result = service.recalculate(
        baseInput({
          dealType: DealType.Finance,
          salePrice: 30000,
          downPayment: 3000,
          rebates: 0,
          apr: 0.069,
          term: 60,
          taxRate: 0.08,
          fees: [
            { amount: 799, taxable: true },
            { amount: 150, taxable: false },
          ],
          tradeIn: null,
        }),
      );
      // taxable base = 30799, tax = 2463.92, amountFinanced = 30000+799+150+2463.92-3000 = 30412.92
      expect(result.totalTax).toBeCloseTo(2463.92, 2);
      expect(result.amountFinanced).toBeCloseTo(30412.92, 2);
    });

    it('subtracts net trade from amount financed', () => {
      const result = service.recalculate(
        baseInput({
          salePrice: 30000,
          taxRate: 0,
          tradeIn: { allowance: 10000, payoff: 4500 },
        }),
      );
      // netTrade = 5500; amountFinanced = 30000 - 5500 = 24500
      expect(result.amountFinanced).toBeCloseTo(24500, 2);
    });

    it('handles negative equity (payoff > allowance)', () => {
      const result = service.recalculate(
        baseInput({
          salePrice: 30000,
          taxRate: 0,
          tradeIn: { allowance: 10000, payoff: 12000 },
        }),
      );
      // netTrade = -2000; amountFinanced = 30000 - (-2000) = 32000
      expect(result.amountFinanced).toBeCloseTo(32000, 2);
    });
  });

  describe('calculateMonthlyPayment', () => {
    it('uses standard amortization formula for Finance deal', () => {
      const result = service.recalculate(
        baseInput({
          dealType: DealType.Finance,
          salePrice: 30000,
          downPayment: 3000,
          rebates: 0,
          apr: 0.069,
          term: 60,
          taxRate: 0.08,
          fees: [
            { amount: 799, taxable: true },
            { amount: 150, taxable: false },
          ],
        }),
      );
      // Monthly rate = 0.069/12 = 0.00575
      // P = 30412.92
      // M = P * [r(1+r)^n] / [(1+r)^n - 1]
      const r = 0.069 / 12;
      const n = 60;
      const p = result.amountFinanced;
      const expected = p * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      expect(result.monthlyPayment).toBeCloseTo(expected, 2);
    });

    it('uses P/n formula when APR is 0', () => {
      const result = service.recalculate(
        baseInput({
          dealType: DealType.Finance,
          salePrice: 24000,
          downPayment: 0,
          apr: 0,
          term: 48,
          taxRate: 0,
        }),
      );
      expect(result.monthlyPayment).toBeCloseTo(24000 / 48, 2);
    });

    it('returns 0 monthly payment for Cash deals', () => {
      const result = service.recalculate(
        baseInput({
          dealType: DealType.Cash,
          salePrice: 20000,
          apr: 6.9,
          term: 60,
          taxRate: 0,
        }),
      );
      expect(result.monthlyPayment).toBe(0);
    });
  });

  describe('calculateFrontEndGross', () => {
    it('computes sale price minus vehicle cost', () => {
      const result = service.recalculate(
        baseInput({ salePrice: 30000, vehicleCost: 25000, taxRate: 0 }),
      );
      expect(result.frontEndGross).toBeCloseTo(5000, 2);
    });

    it('handles negative front-end gross (below-invoice deal)', () => {
      const result = service.recalculate(
        baseInput({ salePrice: 24000, vehicleCost: 26000, taxRate: 0 }),
      );
      expect(result.frontEndGross).toBeCloseTo(-2000, 2);
    });
  });

  describe('net trade', () => {
    it('returns 0 when allowance and payoff both equal 0 (EC-004)', () => {
      const result = service.recalculate(
        baseInput({
          salePrice: 30000,
          taxRate: 0,
          tradeIn: { allowance: 0, payoff: 0 },
        }),
      );
      expect(result.netTrade).toBe(0);
      expect(result.amountFinanced).toBeCloseTo(30000, 2);
    });
  });
});
