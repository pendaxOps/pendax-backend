import { PaycrestService } from './PaycrestService';
import { PaycrestCreateOrderRequest, PaycrestCreatedOrderData, PaycrestGetOrderStatusResponse } from '../types/paycrest.types';

export interface CreateOfframpParams {
  amount: string;
  token: 'USDT' | 'USDC' | string;
  network?: 'base' | string;
  recipient: PaycrestCreateOrderRequest['recipient'];
  reference?: string;
  returnAddress?: string;
}

export class OfframpService {
  private readonly paycrest: PaycrestService;

  constructor(paycrest?: PaycrestService) {
    this.paycrest = paycrest || new PaycrestService();
  }

  async createOrder(params: CreateOfframpParams): Promise<PaycrestCreatedOrderData> {
    const network = params.network || 'base';
    const rate = await this.paycrest.getRate(params.token, params.amount, params.recipient.currency, network);

    const order = await this.paycrest.createOrder({
      amount: params.amount,
      token: params.token,
      network,
      rate,
      recipient: params.recipient,
      reference: params.reference,
      returnAddress: params.returnAddress,
    });

    return order;
  }

  async getStatus(orderId: string): Promise<PaycrestGetOrderStatusResponse['data']> {
    return this.paycrest.getOrderStatus(orderId);
  }
}


