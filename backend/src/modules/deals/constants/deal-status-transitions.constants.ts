import { DealStatus, UserRole } from '@prisma/client';
import { ForbiddenException, UnprocessableEntityException } from '@nestjs/common';

interface AllowedTransition {
  to: DealStatus;
  roles: UserRole[];
  noteRequired?: boolean;
}

export const DEAL_STATUS_TRANSITIONS: Record<DealStatus, AllowedTransition[]> = {
  [DealStatus.Pending]: [{ to: DealStatus.Desking, roles: [UserRole.SalesConsultant] }],
  [DealStatus.Desking]: [
    { to: DealStatus.Fni, roles: [UserRole.SalesManager] },
    { to: DealStatus.Unwound, roles: [UserRole.SalesConsultant], noteRequired: true },
  ],
  [DealStatus.Fni]: [
    { to: DealStatus.Desking, roles: [UserRole.SalesManager], noteRequired: true },
    { to: DealStatus.ContractsSigned, roles: [UserRole.SalesConsultant, UserRole.FniManager] },
    { to: DealStatus.Unwound, roles: [UserRole.SalesConsultant], noteRequired: true },
  ],
  [DealStatus.ContractsSigned]: [
    { to: DealStatus.Delivered, roles: [UserRole.SalesConsultant] },
    { to: DealStatus.Unwound, roles: [UserRole.SalesConsultant], noteRequired: true },
  ],
  [DealStatus.Delivered]: [
    { to: DealStatus.Funded, roles: [UserRole.SalesConsultant] },
    { to: DealStatus.Unwound, roles: [UserRole.SalesConsultant], noteRequired: true },
  ],
  [DealStatus.Funded]: [],
  [DealStatus.Unwound]: [],
};

export function validateStatusTransition(
  fromStatus: DealStatus,
  toStatus: DealStatus,
  role: UserRole,
  note: string | null,
): void {
  const allowedTransitions = DEAL_STATUS_TRANSITIONS[fromStatus] ?? [];
  const transition = allowedTransitions.find((t) => t.to === toStatus);

  if (!transition) {
    const validNext = allowedTransitions.map((t) => t.to);
    throw new UnprocessableEntityException({
      error: 'INVALID_TRANSITION',
      message: `Cannot transition from ${fromStatus} to ${toStatus}.`,
      validTransitions: validNext,
    });
  }

  if (!transition.roles.includes(role)) {
    throw new ForbiddenException(
      `Role ${role} is not permitted to perform the ${fromStatus} → ${toStatus} transition.`,
    );
  }

  if (transition.noteRequired && !note?.trim()) {
    throw new UnprocessableEntityException({
      error: 'NOTE_REQUIRED',
      message: `A note is required for the ${fromStatus} → ${toStatus} transition.`,
    });
  }
}
