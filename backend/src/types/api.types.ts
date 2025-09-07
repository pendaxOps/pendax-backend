import { TransactionResult } from './transaction.types';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CreateTransactionRequest {
  userAddress: string;
  fromToken: string;        
  amount: string;           
  bankAccount: {
    accountNumber: string;
    bankCode: string;
    accountName: string;
    bankName: string;
  };
}

export interface CreateTransactionResponse {
  transactionId: string;
  status: string;
  estimatedTime: string;
  fees: {
    swapFees: string;
    offrampFees: string;
  };
}


export interface GetTransactionResponse {
  transaction: TransactionResult;
}


export interface GetBanksResponse {
  banks: Array<{
    code: string;
    name: string;
  }>;
}


export interface VerifyBankRequest {
  accountNumber: string;
  bankCode: string;
}

export interface VerifyBankResponse {
  isValid: boolean;
  accountName?: string;
  bankName?: string;
}
