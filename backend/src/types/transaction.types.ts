import { SwapResult } from './swap.types';
import { OfframpResult } from './offramp.types';

export interface TransactionRequest {
  userAddress: string;
  fromToken: string;
  amount: string;
  bankAccount: {
    accountNumber: string;
    bankCode?: string;
    accountName: string;
    bankName: string;
  };
}

export interface TransactionResult {
  transactionId: string;
  status: 'pending' | 'completed' | 'failed';
  fromToken: string;
  fromAmount: string;
  fiatAmount: string;
  swapResult?: SwapResult;
  offrampResult?: OfframpResult;
  createdAt: number;
  completedAt?: number;
  error?: string;
}
