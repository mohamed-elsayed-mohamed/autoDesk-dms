import Decimal from 'decimal.js';
import { FiCalculationService } from '../../../src/modules/fi/calculation/fi-calculation.service';
import { FiProductStatus } from '@prisma/client';

type ProductInput = {
  cost: Decimal;
  sellingPrice: Decimal;
  status: FiProductStatus;
  deletedAt: Date | null;
};

describe('FiCalculationService', () => {
  let service: FiCalculationService;

  beforeEach(() => {
    service = new FiCalculationService();
  });

  describe('calculateSellRate', () => {
    it('returns buyRate + rateMarkup', () => {
      const result = service.calculateSellRate(new Decimal('5.90'), new Decimal('1.50'));
      expect(result.toNumber()).toBeCloseTo(7.40, 2);
    });

    it('returns buyRate when markup is zero', () => {
      const result = service.calculateSellRate(new Decimal('5.90'), new Decimal('0'));
      expect(result.toNumber()).toBeCloseTo(5.90, 2);
    });
  });

  describe('calculateMonthlyPayment', () => {
    it('uses amortization formula: P=28000, sellRate=7.40%, term=60', () => {
      // r = 7.40/100/12 = 0.006167; M = 28000 * r*(1+r)^60 / ((1+r)^60 - 1)
      const result = service.calculateMonthlyPayment(
        new Decimal('28000'),
        new Decimal('7.40'),
        60,
      );
      // P=28000, r=7.40%/12/100≈0.006167, n=60 → M≈$559.73
      expect(result.toNumber()).toBeCloseTo(559.73, 0);
    });

    it('returns P/n when sellRate is 0 (zero-interest)', () => {
      const result = service.calculateMonthlyPayment(
        new Decimal('12000'),
        new Decimal('0'),
        48,
      );
      expect(result.toNumber()).toBeCloseTo(250, 2);
    });

    it('returns 0 when term is 0', () => {
      const result = service.calculateMonthlyPayment(
        new Decimal('20000'),
        new Decimal('5.9'),
        0,
      );
      expect(result.toNumber()).toBe(0);
    });
  });

  describe('calculateFiGross', () => {
    const makeProduct = (
      cost: number,
      sellingPrice: number,
      status: FiProductStatus = FiProductStatus.Active,
      deletedAt: Date | null = null,
    ): ProductInput => ({
      cost: new Decimal(cost),
      sellingPrice: new Decimal(sellingPrice),
      status,
      deletedAt,
    });

    it('sums (sellingPrice - cost) for ACTIVE products only', () => {
      const products: ProductInput[] = [
        makeProduct(800, 1500, FiProductStatus.Active),  // gross 700
        makeProduct(200, 695, FiProductStatus.Active),   // gross 495
        makeProduct(300, 900, FiProductStatus.Cancelled), // excluded
      ];
      expect(service.calculateFiGross(products).toNumber()).toBeCloseTo(1195, 2);
    });

    it('excludes CHARGED_BACK products from gross', () => {
      const products: ProductInput[] = [
        makeProduct(800, 1500, FiProductStatus.Active),
        makeProduct(200, 695, FiProductStatus.ChargedBack),
      ];
      expect(service.calculateFiGross(products).toNumber()).toBeCloseTo(700, 2);
    });

    it('excludes soft-deleted products (deletedAt set)', () => {
      const products: ProductInput[] = [
        makeProduct(800, 1500, FiProductStatus.Active),
        makeProduct(200, 695, FiProductStatus.Active, new Date()),
      ];
      expect(service.calculateFiGross(products).toNumber()).toBeCloseTo(700, 2);
    });

    it('allows negative product gross (cost > sellingPrice)', () => {
      const products: ProductInput[] = [
        makeProduct(1000, 600, FiProductStatus.Active), // gross -400
      ];
      expect(service.calculateFiGross(products).toNumber()).toBeCloseTo(-400, 2);
    });

    it('returns zero when all products are removed or cancelled', () => {
      const products: ProductInput[] = [
        makeProduct(800, 1500, FiProductStatus.Cancelled),
        makeProduct(200, 695, FiProductStatus.Active, new Date()),
      ];
      expect(service.calculateFiGross(products).toNumber()).toBe(0);
    });

    it('returns zero for empty product list', () => {
      expect(service.calculateFiGross([]).toNumber()).toBe(0);
    });
  });

  describe('checkMarkupCapWarning', () => {
    it('returns warning string when markup exceeds cap', () => {
      const warnings = service.checkMarkupCapWarning(new Decimal('2.50'), new Decimal('2.00'));
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('2.5');
      expect(warnings[0]).toContain('2');
    });

    it('returns empty array when markup equals cap exactly', () => {
      const warnings = service.checkMarkupCapWarning(new Decimal('2.00'), new Decimal('2.00'));
      expect(warnings).toHaveLength(0);
    });

    it('returns empty array when markup is below cap', () => {
      const warnings = service.checkMarkupCapWarning(new Decimal('1.50'), new Decimal('2.00'));
      expect(warnings).toHaveLength(0);
    });

    it('returns empty array when cap is null (no cap configured)', () => {
      const warnings = service.checkMarkupCapWarning(new Decimal('5.00'), null);
      expect(warnings).toHaveLength(0);
    });
  });
});
