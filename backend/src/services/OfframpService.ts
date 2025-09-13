import { PaycrestGatewayService } from './PaycrestGatewayService';
import { 
  PaycrestRecipient, 
  PaycrestSmartContractOrder, 
  PaycrestGatewayConfig,
  PaycrestToken,
  PaycrestNetwork
} from '../types/paycrest.types';
import { PAYCREST_GATEWAY_ADDRESS, COMMON_STABLECOINS } from '../utils/blockchain';

export interface CreateOfframpParams {
  amount: string;
  token: PaycrestToken;
  network?: PaycrestNetwork;
  recipient: PaycrestRecipient;
  refundAddress: `0x${string}`;
  reference?: string;
}

export class OfframpService {
  private readonly gatewayService: PaycrestGatewayService;

  constructor(config?: PaycrestGatewayConfig) {
    const defaultConfig: PaycrestGatewayConfig = {
      gatewayAddress: PAYCREST_GATEWAY_ADDRESS,
      tokenAddress: COMMON_STABLECOINS.USDT,
      network: 'base',
      privateKey: process.env.PAYCREST_PRIVATE_KEY || '',
      rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org'
    };

    this.gatewayService = new PaycrestGatewayService(config || defaultConfig);
  }

  async createOrder(params: CreateOfframpParams): Promise<PaycrestSmartContractOrder> {
    if (!params.refundAddress) {
      throw new Error('Refund address is required for smart contract integration');
    }
   
    const tokenAddress = params.token?.toUpperCase() === 'USDC'
      ? (process.env.USDC_ADDRESS as `0x${string}`) || (COMMON_STABLECOINS.USDC as `0x${string}`)
      : (process.env.USDT_ADDRESS as `0x${string}`) || (COMMON_STABLECOINS.USDT as `0x${string}`);

    const tokenConfig: PaycrestGatewayConfig = {
      gatewayAddress: PAYCREST_GATEWAY_ADDRESS,
      tokenAddress,
      network: (params.network || 'base') as PaycrestNetwork,
      privateKey: process.env.PAYCREST_PRIVATE_KEY || '',
      rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org'
    };

    const gateway = new PaycrestGatewayService(tokenConfig);

    return gateway.createOrder(
      params.amount,
      params.token,
      params.recipient,
      params.refundAddress
    );
  }

  async getOrderInfo(orderId: string): Promise<any> {
    return this.gatewayService.getOrderInfo(orderId);
  }

  async getExchangeRate(token: PaycrestToken, amount: string, currency: string): Promise<number> {
    return this.gatewayService.getExchangeRate(token, amount, currency);
  }

  async verifyAccount(recipient: PaycrestRecipient): Promise<string> {
    return this.gatewayService.verifyAccount(recipient);
  }
}


