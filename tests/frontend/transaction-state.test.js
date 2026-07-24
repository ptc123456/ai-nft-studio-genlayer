import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getExecutionOutcome,
  getTransactionStatus,
  isFinalized
} from '../../frontend/transaction-state.js';

test('maps numeric GenLayer status 7 to FINALIZED', () => {
  const receipt = { status: 7 };

  assert.equal(getTransactionStatus(receipt), 'FINALIZED');
  assert.equal(isFinalized(receipt), true);
});

test('accepts SDK status name variants', () => {
  assert.equal(getTransactionStatus({ statusName: 'FINALIZED' }), 'FINALIZED');
  assert.equal(getTransactionStatus({ status_name: 'accepted' }), 'ACCEPTED');
});

test('maps numeric execution result 1 to success', () => {
  assert.deepEqual(getExecutionOutcome({ txExecutionResult: 1 }), {
    success: true,
    name: 'FINISHED_WITH_RETURN'
  });
});

test('maps numeric execution result 2 to failure', () => {
  assert.deepEqual(getExecutionOutcome({ txExecutionResult: 2 }), {
    success: false,
    name: 'FINISHED_WITH_ERROR'
  });
});

test('does not treat NOT_VOTED or missing execution evidence as success', () => {
  assert.deepEqual(getExecutionOutcome({ txExecutionResult: 0 }), {
    success: null,
    name: 'NOT_VOTED'
  });
  assert.deepEqual(getExecutionOutcome({}), {
    success: null,
    name: 'UNKNOWN'
  });
});

test('verifies success from the leader receipt used by Studionet', () => {
  const receipt = {
    status: 7,
    consensus_data: {
      leader_receipt: [
        {
          mode: 'leader',
          execution_result: 'SUCCESS',
          result: { status: 'return', payload: { readable: '1' } },
          genvm_result: {
            error_code: null,
            raw_error: null
          }
        }
      ]
    }
  };

  assert.deepEqual(getExecutionOutcome(receipt), {
    success: true,
    name: 'SUCCESS'
  });
});

test('rejects a finalized receipt whose leader execution failed', () => {
  const receipt = {
    status: 7,
    consensus_data: {
      leader_receipt: [
        {
          mode: 'leader',
          execution_result: 'ERROR',
          result: { status: 'error' },
          genvm_result: { error_code: 'VM_ERROR' }
        }
      ]
    }
  };

  assert.deepEqual(getExecutionOutcome(receipt), {
    success: false,
    name: 'ERROR'
  });
});
