import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0x2676763dBD21891C5D4945d0e20D2108802C0997';

export const TransactionStatus = {
  FINALIZED: 'FINALIZED',
  ACCEPTED: 'ACCEPTED',
  READY_TO_FINALIZE: 'READY_TO_FINALIZE',
  PENDING: 'PENDING'
};

export const ExecutionResult = {
  FINISHED_WITH_RETURN: 'FINISHED_WITH_RETURN',
  FINISHED_WITH_ERROR: 'FINISHED_WITH_ERROR',
  SUCCESS: 'SUCCESS'
};

export const readClient = createClient({
  chain: studionet
});

export const writeClient = createClient({
  chain: studionet,
  account: typeof window !== 'undefined' && window.ethereum ? createAccount(window.ethereum) : null
});
