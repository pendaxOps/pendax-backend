import express from 'express';
import { ServiceManager } from '../services/ServiceManager';
import { GATEWAY_ABI } from '../services/PaycrestGatewayService';
import { encodeFunctionData, erc20Abi, parseUnits, zeroAddress } from 'viem';

const router = express.Router();
const serviceManager = ServiceManager.getInstance();

router.post('/createOrder', async (req, res) => {
  try {
    const { amount, token, network = 'base', recipient, refundAddress } = req.body as any;
    if (!amount || !token || !recipient || !refundAddress) {
      return res.status(400).json({ success: false, error: 'Missing required fields: amount, token, recipient, refundAddress' });
    }

    const offrampService = serviceManager.getOfframpService();
    const transactionService = serviceManager.getTransactionService();
    const rate = await offrampService.getExchangeRate(token, amount, recipient.currency);
    const accountName = await offrampService.verifyAccount(recipient);

    const gatewayService: any = (offrampService as any).gatewayService || undefined;
    const messageHash = await (gatewayService?.encryptRecipientData
      ? gatewayService.encryptRecipientData({ ...recipient, accountName })
      : (async () => {
          const r = await fetch('https://api.paycrest.io/v1/pubkey');
          const j = await r.json();
          return JSON.stringify({ ...recipient, accountName });
        })());

    const tokenAddress = token?.toUpperCase() === 'USDC'
      ? (process.env.USDC_ADDRESS as `0x${string}`)
      : (process.env.USDT_ADDRESS as `0x${string}`);
    const gatewayAddress = (process.env.PAYCREST_GATEWAY_ADDRESS as `0x${string}`);
    const amountWei = parseUnits(String(amount), 6);
    const rate96 = BigInt(Math.round(Number(rate) * 100));

    const approval = {
      to: tokenAddress,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [gatewayAddress, amountWei]
      }) as `0x${string}`
    };

    const createOrder = {
      to: gatewayAddress,
      data: encodeFunctionData({
        abi: GATEWAY_ABI,
        functionName: 'createOrder',
        args: [
          tokenAddress,
          amountWei,
          rate96,
          zeroAddress,
          0n,
          refundAddress as `0x${string}`,
          messageHash
        ]
      }) as `0x${string}`
    };

    let transactionId: string | undefined;
    try {
      const tx = await transactionService.createTransaction({
        wallet_address: (refundAddress as string).toLowerCase(),
        transaction_type: 'offramp',
        from_currency: token,
        to_currency: recipient.currency,
        amount_sent: parseFloat(String(amount)),
        amount_received: 0,
        fee: 0,
        recipient,
        status: 'pending',
        network
      });
      transactionId = tx?.id;
    } catch (e) {
      console.warn('prepare: failed to create pending transaction (non-blocking):', (e as Error).message);
    }

    res.json({
      success: true,
      data: {
        tokenAddress,
        gatewayAddress,
        amountWei: amountWei.toString(),
        rate96: rate96.toString(),
        messageHash,
        approval,
        createOrder,
        transactionId
      }
    });
  } catch (error: any) {
    console.error('Prepare offramp error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to prepare offramp' });
  }
});

router.get('/:orderId/status', async (req, res) => {
  try {
    const offrampService = serviceManager.getOfframpService();
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Order ID is required'
      });
    }

    const orderInfo = await offrampService.getOrderInfo(orderId);

    res.json({
      success: true,
      data: orderInfo
    });

  } catch (error: any) {
    console.error('Get status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get order status'
    });
  }
});

router.get('/orders/:chainId/:orderId', async (req, res) => {
  try {
    const offrampService = serviceManager.getOfframpService();
    const { chainId, orderId } = req.params;

    if (!orderId || !chainId) {
      return res.status(400).json({
        success: false,
        error: 'Order ID and Chain ID are required'
      });
    }

    const orderInfo = await offrampService.getOrderInfo(orderId);
    
    const transactionService = serviceManager.getTransactionService();
    let transaction;
    try {
      transaction = await transactionService.getTransactionByOrderId(orderId);
    } catch (error) {
      console.log('Transaction not found in database for order:', orderId);
    }

    const response = {
      success: true,
      data: {
        orderId: orderId,
        status: orderInfo.isFulfilled ? 'completed' : 
                orderInfo.isRefunded ? 'failed' : 'pending',
        isFulfilled: orderInfo.isFulfilled,
        isRefunded: orderInfo.isRefunded,
        sender: orderInfo.sender,
        token: orderInfo.token,
        amount: orderInfo.amount,
        refundAddress: orderInfo.refundAddress,
        createdAt: transaction?.created_at || new Date().toISOString(),
        updatedAt: transaction?.updated_at || new Date().toISOString(),
        txHash: transaction?.tx_hash || null,
        chainId: parseInt(chainId),
        network: 'base'
      }
    };

    res.json(response);

  } catch (error: any) {
    console.error('Get order details error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get order details'
    });
  }
});

router.get('/tokens', async (_req, res) => {
  try {
    const r = await fetch('https://api.paycrest.io/v1/tokens');
    const data = await r.json();
    res.json({ success: true, data: (data as any).data || [] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch tokens' });
  }
});

router.get('/institutions/:currency', async (req, res) => {
  try {
    const r = await fetch(`https://api.paycrest.io/v1/institutions/${req.params.currency}`);
    const data = await r.json();
    res.json({ success: true, data: (data as any).data || [] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch institutions' });
  }
});

router.get('/pubkey', async (_req, res) => {
  try {
    const r = await fetch('https://api.paycrest.io/v1/pubkey');
    const data = await r.json();
    res.json({ success: true, data: (data as any).data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch pubkey' });
  }
});

router.post('/verify-account', async (req, res) => {
  try {
    const r = await fetch('https://api.paycrest.io/v1/verify-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await r.json();
    res.json({ success: (data as any).status === 'success', data: (data as any).data, message: (data as any).message });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to verify account' });
  }
});

router.get('/rate/:token/:amount/:currency', async (req, res) => {
  try {
    const offrampService = serviceManager.getOfframpService();
    const { token, amount, currency } = req.params;

    if (!token || !amount || !currency) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: token, amount, currency'
      });
    }

    const rate = await offrampService.getExchangeRate(
      token, 
      amount, 
      currency
    );

    res.json({
      success: true,
      data: { rate }
    });

  } catch (error: any) {
    console.error('Get rate error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get rate'
    });
  }
});

router.get('/transactions/:walletAddress', async (req, res) => {
  try {
    const transactionService = serviceManager.getTransactionService();
    const { walletAddress } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    const transactions = await transactionService.getTransactionsByWallet(
      walletAddress,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    res.json({
      success: true,
      data: transactions
    });

  } catch (error: any) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get transactions'
    });
  }
});

router.get('/transaction/:id', async (req, res) => {
  try {
    const transactionService = serviceManager.getTransactionService();
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Transaction ID is required'
      });
    }

    const transaction = await transactionService.getTransaction(id);

    res.json({
      success: true,
      data: transaction
    });

  } catch (error: any) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get transaction'
    });
  }
});

router.post('/update-transaction/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, tx_hash } = req.body;
    
    const transactionService = serviceManager.getTransactionService();
    
    const updates: any = {};
    if (status) updates.status = status;
    if (tx_hash) updates.tx_hash = tx_hash;
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No updates provided'
      });
    }
    
    await transactionService.updateTransactionByOrderId(orderId, updates);
    
    res.json({
      success: true,
      message: `Transaction ${orderId} updated successfully`,
      updates
    });
  } catch (error: any) {
    console.error('Manual update error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update transaction'
    });
  }
});

router.post('/updateDB', async (req, res) => {
  try {
    const { transactionId, txHash, orderId } = req.body;
    
    if (!transactionId || !txHash || !orderId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: transactionId, txHash, orderId'
      });
    }
    
    const transactionService = serviceManager.getTransactionService();
    
    const updates = {
      tx_hash: txHash,
      order_id: orderId,
      status: 'processing' as const
    };
    
    await transactionService.updateTransaction(transactionId, updates);
    
    console.log(`✅ Transaction ${transactionId} updated with tx_hash=${txHash}, order_id=${orderId}`);
    
    res.json({
      success: true,
      message: 'Transaction submitted successfully',
      data: {
        transactionId,
        txHash,
        orderId,
        status: 'processing'
      }
    });
    
  } catch (error: any) {
    console.error('Submit transaction error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit transaction'
    });
  }
});

router.post('/webhook', async (req, res) => {
  try {
    const transactionService = serviceManager.getTransactionService();
    const { event, orderId, status, data } = req.body;

    console.log('📨 Webhook received:', { event, orderId, status, data });

    if (!orderId || !event) {
      return res.status(400).json({
        success: false,
        error: 'Invalid webhook payload - missing orderId or event'
      });
    }

    const statusMap: { [key: string]: string } = {
      'payment_order.pending': 'pending',
      'payment_order.validated': 'completed',
      'payment_order.settled': 'completed',
      'payment_order.refunded': 'failed',
      'payment_order.expired': 'failed'
    };

    const newStatus = statusMap[event] || status || 'pending';

    // Prepare update object
    const updates: any = {
      status: newStatus as any
    };

    // Extract tx_hash if available in the webhook data
    if (data && data.txHash) {
      updates.tx_hash = data.txHash;
      console.log(`📝 Updating tx_hash for order ${orderId}: ${data.txHash}`);
    }

    try {
      await transactionService.updateTransactionByOrderId(orderId, updates);
      console.log(`✅ Webhook processed: Order ${orderId} updated with status=${newStatus}${updates.tx_hash ? `, tx_hash=${updates.tx_hash}` : ''}`);
    } catch (e: any) {
      console.warn(`⚠️ No matching transaction for order ${orderId}. Status=${newStatus}. Continuing.`);
    }

    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully'
    });

  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process webhook'
    });
  }
});

export { router as offrampRoutes };
