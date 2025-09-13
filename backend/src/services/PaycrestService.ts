import axios, { AxiosInstance } from 'axios';
import {
  PaycrestRateResponse,
  PaycrestCreateOrderRequest,
  PaycrestCreateOrderResponse,
  PaycrestGetOrderStatusResponse,
  PaycrestCurrenciesResponse,
  PaycrestInstitutionsResponse,
  PaycrestCreatedOrderData,
  PaycrestOrderStatusData,
} from '../types/paycrest.types';

const DEFAULT_BASE_URL = 'https://api.paycrest.io/v1';

export class PaycrestService {
  private readonly http: AxiosInstance;

  constructor(
    apiKey: string = process.env.PAYCREST_API_KEY || '',
    baseURL: string = DEFAULT_BASE_URL
  ) {
    if (!apiKey) {
      throw new Error('PAYCREST_API_KEY is not set');
    }

    this.http = axios.create({
      baseURL,
      headers: {
        'API-Key': apiKey,
      },
    });
  }

  async getRate(token: string, amount: string, currency: string, network?: string): Promise<string> {
    const res = await this.http.get<PaycrestRateResponse>(`/rates/${token}/${amount}/${currency}`, {
      params: network ? { network } : undefined,
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.data.status !== 'success' || !res.data.data) {
      throw new Error(res.data.message || 'Failed to fetch rate');
    }
    return res.data.data;
  }

  async createOrder(payload: PaycrestCreateOrderRequest): Promise<PaycrestCreatedOrderData> {
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const res = await this.http.post<PaycrestCreateOrderResponse>(`/sender/orders`, payload, {
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (res.data.status !== 'success' || !res.data.data) {
          throw new Error(res.data.message || 'Failed to create order');
        }
        
        return res.data.data;
      } catch (error: any) {
        lastError = error;
        console.log(`Order creation attempt ${attempt} failed:`, error.message);
        
        if (attempt === maxRetries) {
          break;
        }
        
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  async getOrderStatus(orderId: string): Promise<PaycrestGetOrderStatusResponse['data']> {
    const res = await this.http.get<PaycrestGetOrderStatusResponse>(`/sender/orders/${orderId}`);
    if (res.data.status !== 'success' || !res.data.data) {
      throw new Error(res.data.message || 'Failed to get order status');
    }
    return res.data.data;
  }

  async getSupportedCurrencies(): Promise<PaycrestCurrenciesResponse['data']> {
    const res = await this.http.get<PaycrestCurrenciesResponse>(`/currencies`);
    if (res.data.status !== 'success') {
      throw new Error(res.data.message || 'Failed to get currencies');
    }
    return res.data.data || [];
  }

  async getInstitutions(currency: string): Promise<PaycrestInstitutionsResponse['data']> {
    const res = await this.http.get<PaycrestInstitutionsResponse>(`/institutions/${currency}`);
    if (res.data.status !== 'success') {
      throw new Error(res.data.message || 'Failed to get institutions');
    }
    return res.data.data || [];
  }
}

