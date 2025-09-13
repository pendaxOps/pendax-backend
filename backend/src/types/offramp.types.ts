export interface BankAccount {
  accountNumber: string;
  bankCode: string;
  accountName: string;
  bankName: string;
}

export interface OfframpRequest {
  amount: string;
  stablecoin: 'USDC' | 'USDT';
  bankAccount: BankAccount;
  userAddress: string;
}

export interface OfframpResult {
  transactionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  amount: string;
  fiatAmount: string;
  fees: string;
  createdAt: number;
}
