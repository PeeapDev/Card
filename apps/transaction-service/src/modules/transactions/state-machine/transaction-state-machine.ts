import { Injectable, BadRequestException } from '@nestjs/common';
import { TransactionState, VALID_STATE_TRANSITIONS } from '@payment-system/database';

@Injectable()
export class TransactionStateMachine {
  canTransition(currentState: TransactionState, targetState: TransactionState): boolean {
    const validTransitions = VALID_STATE_TRANSITIONS[currentState] || [];
    return validTransitions.includes(targetState);
  }

  validateTransition(currentState: TransactionState, targetState: TransactionState): void {
    if (!this.canTransition(currentState, targetState)) {
      throw new BadRequestException(
        `Invalid state transition from ${currentState} to ${targetState}`,
      );
    }
  }

  getValidNextStates(currentState: TransactionState): TransactionState[] {
    return VALID_STATE_TRANSITIONS[currentState] || [];
  }

  isTerminalState(state: TransactionState): boolean {
    const terminalStates = [
      TransactionState.SETTLED,
      TransactionState.VOIDED,
      TransactionState.FAILED,
      TransactionState.CANCELLED,
    ];
    return terminalStates.includes(state);
  }

  canBeReversed(state: TransactionState): boolean {
    return [
      TransactionState.AUTHORIZED,
      TransactionState.CAPTURED,
    ].includes(state);
  }

  canBeRefunded(state: TransactionState): boolean {
    return [
      TransactionState.CAPTURED,
      TransactionState.SETTLED,
      TransactionState.PARTIAL_REFUND,
    ].includes(state);
  }
}
