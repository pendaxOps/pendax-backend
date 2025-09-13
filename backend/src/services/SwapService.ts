import { ethers } from 'ethers';
import axios from 'axios';
import { createWallet, getTokenBalance, getTokenInfo, ETH_ADDRESS } from '../utils/blockchain';
import { SwapRequest, SwapResult } from '../types/swap.types';

export class SwapService {
  private wallet: ethers.Wallet;
  private network: 'base' | 'sepolia';
  private chainId: number;

  constructor(privateKey: string, network: 'base' | 'sepolia' = 'base') {
    this.wallet = createWallet(privateKey as `0x${string}`, network) as any;
    this.network = network;
    this.chainId = network === 'base' ? 8453 : 11155111;
  }

  async getSwapQuote(request: SwapRequest): Promise<{
    fromAmount: string;
    toAmount: string;
    estimatedGas: string;
    priceImpact: number;
  }> {
    const { fromToken, toToken, amount, userAddress, slippage = 1 } = request;

    try {
      const response = await axios.get(`https://api.1inch.io/v5.2/${this.chainId}/quote`, {
        params: {
          fromTokenAddress: fromToken,
          toTokenAddress: toToken,
          amount: ethers.parseUnits(amount, 18).toString(),
          slippage: slippage
        }
      });

      const quote = response.data;
      
      return {
        fromAmount: amount,
        toAmount: ethers.formatUnits(quote.toTokenAmount, quote.toToken.decimals),
        estimatedGas: quote.estimatedGas,
        priceImpact: parseFloat(quote.estimatedGas) / 100
      };

    } catch (error) {
      throw new Error(`Failed to get swap quote: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async executeSwap(request: SwapRequest): Promise<SwapResult> {
    const { fromToken, toToken, amount, userAddress, slippage = 1 } = request;

    try {
      const userBalance = await getTokenBalance(userAddress as `0x${string}`, fromToken as `0x${string}`, this.network);
      if (parseFloat(userBalance) < parseFloat(amount)) {
        throw new Error('Insufficient balance');
      }

      const swapData = await this.getSwapTransactionData(request);
      
      const tx = await this.wallet.sendTransaction(swapData);
      const receipt = await tx.wait();

      if (!receipt) {
        throw new Error('Transaction not mined or was replaced.');
      }

      return {
        transactionHash: tx.hash,
        fromAmount: amount,
        toAmount: '0',
        status: 'success',
        gasUsed: receipt.gasUsed.toString()
      };

    } catch (error) {
      return {
        transactionHash: '',
        fromAmount: amount,
        toAmount: '0',
        status: 'failed',
        gasUsed: '0'
      };
    }
  }

  private async getSwapTransactionData(request: SwapRequest) {
    const { fromToken, toToken, amount, userAddress, slippage = 1 } = request;

    const response = await axios.get(`https://api.1inch.io/v5.2/${this.chainId}/swap`, {
      params: {
        fromTokenAddress: fromToken,
        toTokenAddress: toToken,
        amount: ethers.parseUnits(amount, 18).toString(),
        fromAddress: userAddress,
        slippage: slippage,
        disableEstimate: true
      }
    });

    return response.data.tx;
  }

 
  async needsSwap(tokenAddress: string): Promise<boolean> {
    if (tokenAddress === ETH_ADDRESS) {
      return true;
    }

    const commonStablecoins = [
      '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    ];

    return !commonStablecoins.includes(tokenAddress);
  }

  getBestStablecoin(): string {
    return '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
  }
}
