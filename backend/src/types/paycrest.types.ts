export interface PaycrestResponse<T = unknown> {
  status: 'success' | 'error' | string;
  message?: string;
  data?: T;
}

export interface PaycrestRateResponse extends PaycrestResponse<string> {}

export type PaycrestToken = 'USDT' | 'USDC' | string;
export type PaycrestNetwork = 'base' | string;

export interface PaycrestRecipient {
  institution: string;
  accountIdentifier: string;
  accountName: string;
  currency: string;
  memo?: string;
}

export interface PaycrestGatewayConfig {
  gatewayAddress: string;
  tokenAddress: string;
  network: PaycrestNetwork;
  privateKey: string;
  rpcUrl: string;
}

export interface PaycrestCreateOrderRequest {
  amount: number;
  token: PaycrestToken;
  network: PaycrestNetwork;
  rate: string;
  recipient: PaycrestRecipient;
  reference?: string;
  returnAddress?: string;
}

export interface PaycrestCreatedOrderData {
  id: string;
  amount: string;
  token: PaycrestToken;
  network: PaycrestNetwork;
  receiveAddress: string;
  validUntil: string;
  senderFee?: string;
  transactionFee?: string;
  reference?: string;
}

export interface PaycrestSmartContractOrder {
  orderId: string;
  transactionHash: string;
  amount: string;
  token: PaycrestToken;
  network: PaycrestNetwork;
  rate: string;
  recipient: PaycrestRecipient;
  refundAddress: string;
  status: 'pending' | 'completed' | 'failed';
}

export interface PaycrestCreateOrderResponse
  extends PaycrestResponse<PaycrestCreatedOrderData> {}

export type PaycrestOrderStatus =
  | 'pending'
  | 'processing'
  | 'fulfilled'
  | 'validated'
  | 'completed'
  | 'cancelled'
  | 'failed'
  | 'payment_order.pending'
  | 'payment_order.validated'
  | 'payment_order.expired'
  | 'payment_order.settled'
  | 'payment_order.refunded'
  | string;

export interface PaycrestOrderStatusData extends PaycrestCreatedOrderData {
  status?: PaycrestOrderStatus;
}

export interface PaycrestGetOrderStatusResponse
  extends PaycrestResponse<PaycrestOrderStatusData> {}

export interface PaycrestWebhookPayload {
  event: string;
  orderId: string;
  status: PaycrestOrderStatus;
  timestamp: string;
  data?: {
    txHash?: string;
    providerId?: string;
    settlementAmount?: string;
  };
}

export interface PaycrestCurrency {
  code: string;
  name?: string;
}

export interface PaycrestInstitution {
  code: string;
  name?: string;
}

export type PaycrestCurrenciesResponse = PaycrestResponse<PaycrestCurrency[]>
export type PaycrestInstitutionsResponse = PaycrestResponse<PaycrestInstitution[]>


