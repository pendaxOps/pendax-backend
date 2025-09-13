import { supabaseAdmin } from '../lib/supabase';

export interface TransactionData {
  wallet_address: string;
  transaction_type: 'swap' | 'offramp' | 'transfer';
  from_currency: string;
  to_currency: string;
  amount_sent: number;
  amount_received: number;
  fee: number;
  recipient: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  tx_hash?: string;
  order_id?: string;
  time_spent?: string;
  network?: string;
}

export interface TransactionUpdate {
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  tx_hash?: string;
  time_spent?: string;
  amount_received?: number;
}

export class TransactionService {
  async createTransaction(data: TransactionData) {
    try {
      const { data: transaction, error } = await supabaseAdmin()
        .from('transactions')
        .insert(data)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create transaction: ${error.message}`);
      }

      return transaction;
    } catch (error) {
      console.error('TransactionService.createTransaction error:', error);
      throw error;
    }
  }

  async getTransaction(id: string) {
    try {
      const { data: transaction, error } = await supabaseAdmin()
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw new Error(`Failed to get transaction: ${error.message}`);
      }

      return transaction;
    } catch (error) {
      console.error('TransactionService.getTransaction error:', error);
      throw error;
    }
  }

  async getTransactionsByWallet(walletAddress: string, limit = 20, offset = 0) {
    try {
      const { data: transactions, error } = await supabaseAdmin()
        .from('transactions')
        .select('*')
        .eq('wallet_address', walletAddress.toLowerCase())
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Failed to get transactions: ${error.message}`);
      }

      return transactions;
    } catch (error) {
      console.error('TransactionService.getTransactionsByWallet error:', error);
      throw error;
    }
  }

  async updateTransaction(id: string, updates: TransactionUpdate) {
    try {
      const { data: transaction, error } = await supabaseAdmin()
        .from('transactions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update transaction: ${error.message}`);
      }

      return transaction;
    } catch (error) {
      console.error('TransactionService.updateTransaction error:', error);
      throw error;
    }
  }

  async getTransactionByOrderId(orderId: string) {
    try {
      const { data: transaction, error } = await supabaseAdmin()
        .from('transactions')
        .select('*')
        .eq('order_id', orderId)
        .single();

      if (error) {
        throw new Error(`Failed to get transaction by order ID: ${error.message}`);
      }

      return transaction;
    } catch (error) {
      console.error('TransactionService.getTransactionByOrderId error:', error);
      throw error;
    }
  }

  async updateTransactionByOrderId(orderId: string, updates: TransactionUpdate) {
    try {
      const { data: transaction, error } = await supabaseAdmin()
        .from('transactions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('order_id', orderId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update transaction by order ID: ${error.message}`);
      }

      console.log(`✅ Updated transaction for order ${orderId}:`, updates);
      return transaction;
    } catch (error) {
      console.error('TransactionService.updateTransactionByOrderId error:', error);
      throw error;
    }
  }
}
