import {
  validateStatusTransition,
  DEAL_STATUS_TRANSITIONS,
} from '../../../src/modules/deals/constants/deal-status-transitions.constants';
import { DealStatus, UserRole } from '@prisma/client';

describe('validateStatusTransition', () => {
  describe('valid transitions', () => {
    it('allows Pending → Desking for SalesConsultant', () => {
      expect(() =>
        validateStatusTransition(DealStatus.Pending, DealStatus.Desking, UserRole.SalesConsultant, null),
      ).not.toThrow();
    });

    it('allows Desking → Fni for SalesManager (approve)', () => {
      expect(() =>
        validateStatusTransition(DealStatus.Desking, DealStatus.Fni, UserRole.SalesManager, null),
      ).not.toThrow();
    });

    it('allows Fni → Desking for SalesManager (send-back with note)', () => {
      expect(() =>
        validateStatusTransition(DealStatus.Fni, DealStatus.Desking, UserRole.SalesManager, 'Needs revision'),
      ).not.toThrow();
    });

    it('allows Fni → ContractsSigned for SalesConsultant', () => {
      expect(() =>
        validateStatusTransition(DealStatus.Fni, DealStatus.ContractsSigned, UserRole.SalesConsultant, null),
      ).not.toThrow();
    });

    it('allows Fni → ContractsSigned for FniManager', () => {
      expect(() =>
        validateStatusTransition(DealStatus.Fni, DealStatus.ContractsSigned, UserRole.FniManager, null),
      ).not.toThrow();
    });

    it('allows ContractsSigned → Delivered for SalesConsultant', () => {
      expect(() =>
        validateStatusTransition(DealStatus.ContractsSigned, DealStatus.Delivered, UserRole.SalesConsultant, null),
      ).not.toThrow();
    });

    it('allows Delivered → Funded for SalesConsultant', () => {
      expect(() =>
        validateStatusTransition(DealStatus.Delivered, DealStatus.Funded, UserRole.SalesConsultant, null),
      ).not.toThrow();
    });

    it.each([DealStatus.Desking, DealStatus.Fni, DealStatus.ContractsSigned, DealStatus.Delivered])(
      'allows %s → Unwound for SalesConsultant with note',
      (from) => {
        expect(() =>
          validateStatusTransition(from, DealStatus.Unwound, UserRole.SalesConsultant, 'Customer backed out'),
        ).not.toThrow();
      },
    );
  });

  describe('invalid transitions — wrong role', () => {
    it('rejects SalesConsultant approving deal (Desking → Fni)', () => {
      expect(() =>
        validateStatusTransition(DealStatus.Desking, DealStatus.Fni, UserRole.SalesConsultant, null),
      ).toThrow();
    });

    it('rejects FniManager approving deal (Desking → Fni)', () => {
      expect(() =>
        validateStatusTransition(DealStatus.Desking, DealStatus.Fni, UserRole.FniManager, null),
      ).toThrow();
    });

    it('rejects SalesConsultant sending back (Fni → Desking)', () => {
      expect(() =>
        validateStatusTransition(DealStatus.Fni, DealStatus.Desking, UserRole.SalesConsultant, 'Note'),
      ).toThrow();
    });
  });

  describe('invalid transitions — wrong fromStatus', () => {
    it('rejects Pending → Funded (skipping pipeline)', () => {
      expect(() =>
        validateStatusTransition(DealStatus.Pending, DealStatus.Funded, UserRole.SalesConsultant, null),
      ).toThrow();
    });

    it('rejects Desking → Delivered (skipping F&I and Contracts Signed)', () => {
      expect(() =>
        validateStatusTransition(DealStatus.Desking, DealStatus.Delivered, UserRole.SalesConsultant, null),
      ).toThrow();
    });
  });

  describe('terminal states', () => {
    it('rejects any transition from Funded', () => {
      expect(() =>
        validateStatusTransition(DealStatus.Funded, DealStatus.Desking, UserRole.SalesManager, null),
      ).toThrow();
    });

    it('rejects any transition from Unwound', () => {
      expect(() =>
        validateStatusTransition(DealStatus.Unwound, DealStatus.Pending, UserRole.SalesConsultant, null),
      ).toThrow();
    });
  });

  describe('note requirement', () => {
    it('rejects UNWOUND without a note', () => {
      expect(() =>
        validateStatusTransition(DealStatus.Desking, DealStatus.Unwound, UserRole.SalesConsultant, null),
      ).toThrow(/note required/i);
    });

    it('rejects Fni → Desking send-back without a note', () => {
      expect(() =>
        validateStatusTransition(DealStatus.Fni, DealStatus.Desking, UserRole.SalesManager, null),
      ).toThrow(/note required/i);
    });

    it('accepts UNWOUND with a note', () => {
      expect(() =>
        validateStatusTransition(DealStatus.Desking, DealStatus.Unwound, UserRole.SalesConsultant, 'Reason'),
      ).not.toThrow();
    });
  });
});
