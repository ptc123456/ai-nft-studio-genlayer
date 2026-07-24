import {
  executionResultNumberToName,
  transactionsStatusNumberToName
} from 'genlayer-js/types';

function normalizeMappedValue(value, numberToName) {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  const raw = String(value);
  return String(numberToName[raw] || raw).toUpperCase();
}

export function getTransactionStatus(receipt) {
  const rawStatus = receipt?.statusName ?? receipt?.status_name ?? receipt?.status;
  return normalizeMappedValue(rawStatus, transactionsStatusNumberToName);
}

export function getExecutionOutcome(receipt) {
  const rawExecutionResult =
    receipt?.txExecutionResultName ??
    receipt?.tx_execution_result_name ??
    receipt?.txExecutionResult ??
    receipt?.tx_execution_result;

  const normalizedResult = normalizeMappedValue(
    rawExecutionResult,
    executionResultNumberToName
  );

  if (normalizedResult === 'FINISHED_WITH_RETURN' || normalizedResult === 'SUCCESS') {
    return { success: true, name: normalizedResult };
  }

  if (normalizedResult === 'FINISHED_WITH_ERROR' || normalizedResult === 'ERROR') {
    return { success: false, name: normalizedResult };
  }

  const leaderReceipts =
    receipt?.consensus_data?.leader_receipt ??
    receipt?.consensusData?.leaderReceipt ??
    [];
  const leaderReceipt =
    leaderReceipts.find?.(entry => entry?.mode === 'leader') ??
    leaderReceipts[0];

  const leaderExecution = String(
    leaderReceipt?.execution_result ?? leaderReceipt?.executionResult ?? ''
  ).toUpperCase();
  const leaderResultStatus = String(
    leaderReceipt?.result?.status ?? ''
  ).toUpperCase();
  const genvmResult = leaderReceipt?.genvm_result ?? leaderReceipt?.genvmResult;
  const genvmError =
    genvmResult?.error_code ??
    genvmResult?.errorCode ??
    genvmResult?.raw_error ??
    genvmResult?.rawError;

  if (
    leaderExecution === 'SUCCESS' &&
    leaderResultStatus === 'RETURN' &&
    !genvmError
  ) {
    return { success: true, name: 'SUCCESS' };
  }

  if (
    leaderExecution === 'ERROR' ||
    leaderResultStatus === 'ERROR' ||
    Boolean(genvmError)
  ) {
    return { success: false, name: leaderExecution || 'ERROR' };
  }

  return {
    success: null,
    name: normalizedResult || leaderExecution || 'UNKNOWN'
  };
}

export function isFinalized(receipt) {
  return getTransactionStatus(receipt) === 'FINALIZED';
}
