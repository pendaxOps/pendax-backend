// Simple offramp types

// Bank account info
export interface BankAccount {
  accountNumber: string;
  bankCode: string;
  accountName: string;
  bankName: string;
}

// Offramp request
export interface OfframpRequest {
  amount: string;        // Amount in stablecoin
  stablecoin: 'USDC' | 'USDT';
  bankAccount: BankAccount;
  userAddress: string;
}

// Offramp result
export interface OfframpResult {
  transactionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  amount: string;        // Stablecoin amount
  fiatAmount: string;    // Fiat amount received
  fees: string;          // Total fees
  createdAt: number;
}
