import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { FiProductStatus } from '@prisma/client';

export interface ProductForGross {
  cost: Decimal;
  sellingPrice: Decimal;
  status: FiProductStatus;
  deletedAt: Date | null;
}

@Injectable()
export class FiCalculationService {
  /**
   * sell rate = buy rate + rate markup (percentage points)
   */
  calculateSellRate(buyRate: Decimal, rateMarkup: Decimal): Decimal {
    return buyRate.plus(rateMarkup);
  }

  /**
   * Standard amortization: M = P × [r(1+r)^n] / [(1+r)^n − 1]
   * sellRate is in percentage points (e.g. 7.40 = 7.40%)
   * When sellRate = 0: M = P / n
   * When term = 0: returns 0
   */
  calculateMonthlyPayment(approvedAmount: Decimal, sellRate: Decimal, term: number): Decimal {
    if (term === 0) return new Decimal(0);

    const annualRate = sellRate.dividedBy(100);
    if (annualRate.isZero()) {
      return approvedAmount.dividedBy(term);
    }

    const monthlyRate = annualRate.dividedBy(12);
    const factor = monthlyRate.plus(1).toPower(term);
    return approvedAmount.times(monthlyRate.times(factor)).dividedBy(factor.minus(1));
  }

  /**
   * F&I gross = sum of (sellingPrice - cost) for ACTIVE, non-deleted products only
   */
  calculateFiGross(products: ProductForGross[]): Decimal {
    return products
      .filter((p) => p.status === FiProductStatus.Active && p.deletedAt === null)
      .reduce((sum, p) => sum.plus(p.sellingPrice.minus(p.cost)), new Decimal(0));
  }

  /**
   * Returns warning strings when rateMarkup exceeds lender's maxMarkupCap.
   * Returns empty array when cap is null or markup is within cap.
   */
  checkMarkupCapWarning(rateMarkup: Decimal, maxMarkupCap: Decimal | null): string[] {
    if (maxMarkupCap !== null && rateMarkup.greaterThan(maxMarkupCap)) {
      return [
        `Rate markup ${rateMarkup.toFixed(2)}% exceeds lender cap of ${maxMarkupCap.toFixed(2)}%`,
      ];
    }
    return [];
  }
}
