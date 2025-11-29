export enum TransactionState {
  INITIATED = 'INITIATED',
  PENDING = 'PENDING',
  AUTHORIZED = 'AUTHORIZED',
  CAPTURED = 'CAPTURED',
  SETTLED = 'SETTLED',
  VOIDED = 'VOIDED',
  REFUNDED = 'REFUNDED',
  PARTIAL_REFUND = 'PARTIAL_REFUND',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export const VALID_STATE_TRANSITIONS: Record<TransactionState, TransactionState[]> = {
  [TransactionState.INITIATED]: [
    TransactionState.PENDING,
    TransactionState.CANCELLED,
    TransactionState.FAILED,
  ],
  [TransactionState.PENDING]: [
    TransactionState.AUTHORIZED,
    TransactionState.FAILED,
    TransactionState.CANCELLED,
  ],
  [TransactionState.AUTHORIZED]: [
    TransactionState.CAPTURED,
    TransactionState.VOIDED,
    TransactionState.FAILED,
  ],
  [TransactionState.CAPTURED]: [
    TransactionState.SETTLED,
    TransactionState.REFUNDED,
    TransactionState.PARTIAL_REFUND,
  ],
  [TransactionState.SETTLED]: [
    TransactionState.REFUNDED,
    TransactionState.PARTIAL_REFUND,
  ],
  [TransactionState.VOIDED]: [],
  [TransactionState.REFUNDED]: [],
  [TransactionState.PARTIAL_REFUND]: [
    TransactionState.REFUNDED,
    TransactionState.PARTIAL_REFUND,
  ],
  [TransactionState.FAILED]: [],
  [TransactionState.CANCELLED]: [],
};

export function canTransition(
  from: TransactionState,
  to: TransactionState,
): boolean {
  return VALID_STATE_TRANSITIONS[from]?.includes(to) ?? false;
}
