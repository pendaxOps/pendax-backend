import { 
  createPublicClient, 
  createWalletClient, 
  http, 
  getContract, 
  parseUnits, 
  formatUnits, 
  zeroAddress,
  decodeEventLog,
  encodeFunctionData,
  Hash
} from 'viem';
import { base } from 'viem/chains';
import axios from 'axios';
import JSEncrypt from 'jsencrypt';
import {
  PaycrestGatewayConfig,
  PaycrestRecipient,
  PaycrestSmartContractOrder,
  PaycrestToken,
  PaycrestNetwork
} from '../types/paycrest.types';
import { PAYCREST_GATEWAY_ADDRESS, COMMON_STABLECOINS } from '../utils/blockchain';


export const GATEWAY_ABI = [
  {
    name: 'createOrder',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'rate', type: 'uint96' },
      { name: 'senderFeeRecipient', type: 'address' },
      { name: 'senderFee', type: 'uint256' },
      { name: 'refundAddress', type: 'address' },
      { name: 'messageHash', type: 'string' }
    ],
    outputs: [{ name: 'orderId', type: 'bytes32' }]
  },
  {
    name: 'getFeeDetails',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: '', type: 'uint64' },
      { name: '', type: 'uint256' }
    ]
  },
  {
    name: 'isTokenSupported',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_token', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'getOrderInfo',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_orderId', type: 'bytes32' }],
    outputs: [{
      name: '',
      type: 'tuple',
      components: [
        { name: 'sender', type: 'address' },
        { name: 'token', type: 'address' },
        { name: 'senderFeeRecipient', type: 'address' },
        { name: 'senderFee', type: 'uint256' },
        { name: 'protocolFee', type: 'uint256' },
        { name: 'isFulfilled', type: 'bool' },
        { name: 'isRefunded', type: 'bool' },
        { name: 'refundAddress', type: 'address' },
        { name: 'currentBPS', type: 'uint96' },
        { name: 'amount', type: 'uint256' },
      ]
    }]
  },
  {
    name: 'OrderCreated',
    type: 'event',
    inputs: [
      { name: 'sender', type: 'address', indexed: true },
      { name: 'token', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: true },
      { name: 'protocolFee', type: 'uint256', indexed: false },
      { name: 'orderId', type: 'bytes32', indexed: false },
      { name: 'rate', type: 'uint256', indexed: false },
      { name: 'messageHash', type: 'string', indexed: false }
    ]
  },
  {
    name: 'OrderSettled',
    type: 'event',
    inputs: [
      { name: 'splitOrderId', type: 'bytes32', indexed: false },
      { name: 'orderId', type: 'bytes32', indexed: true },
      { name: 'liquidityProvider', type: 'address', indexed: true },
      { name: 'settlePercent', type: 'uint96', indexed: false }
    ]
  },
  {
    name: 'OrderRefunded',
    type: 'event',
    inputs: [
      { name: 'fee', type: 'uint256', indexed: false },
      { name: 'orderId', type: 'bytes32', indexed: true }
    ]
  }
] as const;


const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }]
  }
] as const;

export class PaycrestGatewayService {
  private readonly publicClient: any;
  private readonly walletClient: any;
  private readonly gatewayContract: any;
  private readonly tokenContract: any;
  private readonly config: PaycrestGatewayConfig;

  constructor(config: PaycrestGatewayConfig) {
    this.config = config;

    this.publicClient = createPublicClient({
      chain: config.network === 'base' ? base : undefined,
      transport: http(config.rpcUrl)
    });

    this.walletClient = createWalletClient({
      chain: config.network === 'base' ? base : undefined,
      transport: http(config.rpcUrl),
      account: config.privateKey as `0x${string}`
    });

    this.gatewayContract = getContract({
      address: config.gatewayAddress as `0x${string}`,
      abi: GATEWAY_ABI,
      client: this.walletClient
    });

    this.tokenContract = getContract({
      address: config.tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      client: this.walletClient
    });
  }

  async getExchangeRate(token: PaycrestToken, amount: string, currency: string): Promise<number> {
    try {
      const response = await axios.get(`https://api.paycrest.io/v1/rates/${token.toLowerCase()}/${amount}/${currency.toLowerCase()}`);
      if (response.data.status !== 'success' || !response.data.data) {
        throw new Error(response.data.message || 'Failed to fetch rate');
      }
      return Number(response.data.data);
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      throw new Error('Failed to fetch exchange rate');
    }
  }

  async verifyAccount(recipient: PaycrestRecipient): Promise<string> {
    try {
      const response = await axios.post('https://api.paycrest.io/v1/verify-account', {
        institution: recipient.institution,
        accountIdentifier: recipient.accountIdentifier
      }, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.data.status !== 'success' || !response.data.data) {
        throw new Error(response.data.message || 'Account verification failed');
      }
      return response.data.data;
    } catch (error) {
      console.error('Error verifying account:', error);
      throw new Error('Account verification failed');
    }
  }

  async encryptRecipientData(recipient: PaycrestRecipient): Promise<string> {
    try {
      const response = await axios.get('https://api.paycrest.io/v1/pubkey');
      const { data: publicKey } = response.data;
      
      const encrypt = new JSEncrypt();
      encrypt.setPublicKey(publicKey);
      const encrypted = encrypt.encrypt(JSON.stringify(recipient));
      
      if (!encrypted) {
        throw new Error('Failed to encrypt recipient data');
      }
      return encrypted;
    } catch (error) {
      console.error('Error encrypting recipient data:', error);
      throw new Error('Failed to encrypt recipient data');
    }
  }

  async approveToken(amount: string): Promise<Hash> {
    try {
      const amountWei = parseUnits(amount, 6);
      const userAddress = this.walletClient.account?.address;
      
      if (!userAddress) {
        throw new Error('Wallet not connected');
      }

      const allowance = await this.tokenContract.read.allowance([
        userAddress,
        this.config.gatewayAddress as `0x${string}`
      ]);

      if (allowance >= amountWei) {
        return '0x' as Hash;
      }

      const { request } = await this.tokenContract.simulate.approve({
        args: [this.config.gatewayAddress as `0x${string}`, amountWei]
      });

      const hash = await this.walletClient.writeContract(request);
      await this.publicClient.waitForTransactionReceipt({ hash });
      
      return hash;
    } catch (error) {
      console.error('Error approving tokens:', error);
      throw new Error('Failed to approve tokens');
    }
  }

  async createOrder(
    amount: string,
    tokenSymbol: PaycrestToken,
    recipient: PaycrestRecipient,
    refundAddress: `0x${string}`
  ): Promise<PaycrestSmartContractOrder> {
    try {
      const rate = await this.getExchangeRate(tokenSymbol, amount, recipient.currency);
      
      const accountName = await this.verifyAccount(recipient);
      
      const messageHash = await this.encryptRecipientData({ ...recipient, accountName });
      
      // Token support check
      try {
        const supported = await this.publicClient.readContract({
          address: this.config.gatewayAddress as `0x${string}`,
          abi: GATEWAY_ABI,
          functionName: 'isTokenSupported',
          args: [this.config.tokenAddress as `0x${string}`]
        });
        if (supported === false) {
          throw new Error('Token not supported by gateway');
        }
      } catch (err) {
        console.warn('Skipping token support check:', (err as Error).message);
      }

      try {
        await this.publicClient.readContract({
          address: this.config.gatewayAddress as `0x${string}`,
          abi: GATEWAY_ABI,
          functionName: 'getFeeDetails'
        });
      } catch (err) {
        console.warn('Skipping fee details read:', (err as Error).message);
      }

      await this.approveToken(amount);
      
      const amountWei = parseUnits(amount, 6);
      const { request } = await this.gatewayContract.simulate.createOrder({
        args: [
          this.config.tokenAddress as `0x${string}`,
          amountWei,
          BigInt(Math.round(rate * 100)),
          zeroAddress,
          0n,
          refundAddress,
          messageHash
        ]
      });

      const hash = await this.walletClient.writeContract(request);
      await this.publicClient.waitForTransactionReceipt({ hash });
      
      const orderId = await this.fetchRecentOrderId(
        this.walletClient.account!.address as `0x${string}`,
        this.config.tokenAddress as `0x${string}`,
        amountWei
      );
      
      return {
        orderId: orderId,
        transactionHash: hash,
        amount,
        token: tokenSymbol,
        network: this.config.network,
        rate: rate.toString(),
        recipient,
        refundAddress,
        status: 'pending'
      };
    } catch (error) {
      console.error('Error creating order:', error);
      throw new Error('Failed to create order');
    }
  }

  async getOrderInfo(orderId: string): Promise<any> {
    try {
      const formattedOrderId = orderId.startsWith('0x') ? orderId : `0x${orderId}`;
      
      const orderInfo = await this.publicClient.readContract({
        address: this.config.gatewayAddress as `0x${string}`,
        abi: GATEWAY_ABI,
        functionName: 'getOrderInfo',
        args: [formattedOrderId as `0x${string}`]
      });
      return {
        sender: orderInfo.sender,
        token: orderInfo.token,
        amount: formatUnits(orderInfo.amount, 6),
        isFulfilled: orderInfo.isFulfilled,
        isRefunded: orderInfo.isRefunded,
        refundAddress: orderInfo.refundAddress
      };
    } catch (error) {
      console.error('Error getting order info:', error);
      throw new Error('Failed to get order info');
    }
  }

  private async fetchRecentOrderId(sender: `0x${string}`, token: `0x${string}`, amount: bigint): Promise<string> {
    const toBlock = await this.publicClient.getBlockNumber();
    const logs = await this.publicClient.getContractEvents({
      address: this.config.gatewayAddress as `0x${string}`,
      abi: GATEWAY_ABI,
      eventName: 'OrderCreated',
      args: { sender, token, amount },
      fromBlock: toBlock - 10n,
      toBlock
    });

    if (!logs.length) {
      throw new Error('OrderCreated event not found');
    }

    const decoded = decodeEventLog({
      abi: GATEWAY_ABI,
      eventName: 'OrderCreated',
      data: logs[0].data,
      topics: logs[0].topics
    });

    return decoded.args.orderId as string;
  }
}
