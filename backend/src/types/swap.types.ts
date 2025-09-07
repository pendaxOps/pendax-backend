export type Address = string;
export type TransactionHash = string;

export interface Token {
  address: Address;
  symbol: string;
  decimals: number;
}

export interface SwapRequest {
  fromToken: string; 
  toToken: string;   
  amount: string;    
  userAddress: Address;
  slippage?: number; // default 1% ????
}

export interface SwapResult {
  transactionHash: TransactionHash;
  fromAmount: string;
  toAmount: string;
  status: 'pending' | 'success' | 'failed';
  gasUsed?: string;
}
