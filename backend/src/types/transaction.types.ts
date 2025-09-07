import { SwapResult } from './swap.types';
import { OfframpResult } from './offramp.types';

// transaction request
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

// Main transaction result
export interface TransactionResult {
  transactionId: string;
  status: 'pending' | 'swap_completed' | 'offramp_completed' | 'failed';
  fromToken: string;
  fromAmount: string;
  fiatAmount: string;       // Final fiat amount
  swapResult?: SwapResult;
  offrampResult?: OfframpResult;
  createdAt: number;
  completedAt?: number;
  error?: string;
}
