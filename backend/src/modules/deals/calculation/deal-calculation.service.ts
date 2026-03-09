import { Injectable } from '@nestjs/common';
import { DealType } from '@prisma/client';

export interface FeeInput {
  amount: number;
  taxable: boolean;
}

export interface TradeInInput {
  allowance: number;
  payoff: number;
}

export interface CalculationInput {
  dealType: DealType;
  salePrice: number;
  downPayment: number;
  rebates: number;
  apr: number;
  term: number;
  taxRate: number;
  vehicleCost: number;
  fees: FeeInput[];
  tradeIn: TradeInInput | null;
}

export interface CalculationResult {
  totalTax: number;
  amountFinanced: number;
  monthlyPayment: number;
  frontEndGross: number;
  netTrade: number;
}

@Injectable()
export class DealCalculationService {
  recalculate(input: CalculationInput): CalculationResult {
    const netTrade = this.calculateNetTrade(input.tradeIn);
    const totalTax = this.calculateTotalTax(input.salePrice, input.fees, input.taxRate);
    const totalFees = input.fees.reduce((sum, fee) => sum + fee.amount, 0);
    const amountFinanced = this.calculateAmountFinanced(
      input.salePrice,
      totalFees,
      totalTax,
      input.downPayment,
      netTrade,
      input.rebates,
    );
    const monthlyPayment = this.calculateMonthlyPayment(
      input.dealType,
      amountFinanced,
      input.apr,
      input.term,
    );
    const frontEndGross = this.calculateFrontEndGross(input.salePrice, input.vehicleCost);

    return { totalTax, amountFinanced, monthlyPayment, frontEndGross, netTrade };
  }

  calculateNetTrade(tradeIn: TradeInInput | null): number {
    if (!tradeIn) return 0;
    return tradeIn.allowance - tradeIn.payoff;
  }

  calculateTotalTax(salePrice: number, fees: FeeInput[], taxRate: number): number {
    const taxableFeeTotal = fees
      .filter((fee) => fee.taxable)
      .reduce((sum, fee) => sum + fee.amount, 0);
    return (salePrice + taxableFeeTotal) * taxRate;
  }

  calculateAmountFinanced(
    salePrice: number,
    totalFees: number,
    totalTax: number,
    downPayment: number,
    netTrade: number,
    rebates: number,
  ): number {
    return salePrice + totalFees + totalTax - downPayment - netTrade - rebates;
  }

  calculateMonthlyPayment(
    dealType: DealType,
    amountFinanced: number,
    apr: number,
    term: number,
  ): number {
    if (dealType === DealType.Cash) return 0;
    if (term === 0) return 0;
    if (apr === 0) return amountFinanced / term;

    const monthlyRate = apr / 12;
    const factor = Math.pow(1 + monthlyRate, term);
    return (amountFinanced * monthlyRate * factor) / (factor - 1);
  }

  calculateFrontEndGross(salePrice: number, vehicleCost: number): number {
    return salePrice - vehicleCost;
  }
}
