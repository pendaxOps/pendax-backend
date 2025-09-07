import { ethers } from 'ethers';
import axios from 'axios';
import { getProvider, createWallet, getTokenBalance, getTokenInfo, ETH_ADDRESS } from '../utils/blockchain';
import { SwapRequest, SwapResult } from '../types/swap.types';

export class SwapService {
  private wallet: ethers.Wallet;
  private network: 'base' | 'sepolia';
  private chainId: number;

  constructor(privateKey: string, network: 'base' | 'sepolia' = 'base') {
    this.wallet = createWallet(privateKey, network);
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
          amount: ethers.parseUnits(amount, 18).toString(), // Convert to wei
          slippage: slippage
        }
      });

      const quote = response.data;
      
      return {
        fromAmount: amount,
        toAmount: ethers.formatUnits(quote.toTokenAmount, quote.toToken.decimals),
        estimatedGas: quote.estimatedGas,
        priceImpact: parseFloat(quote.estimatedGas) / 100 // Convert to percentage
      };

    } catch (error) {
      throw new Error(`Failed to get swap quote: ${error.message}`);
    }
  }

  async executeSwap(request: SwapRequest): Promise<SwapResult> {
    const { fromToken, toToken, amount, userAddress, slippage = 1 } = request;

    try {
      // Check if user has enough balance
      const userBalance = await getTokenBalance(userAddress, fromToken, this.network);
      if (parseFloat(userBalance) < parseFloat(amount)) {
        throw new Error('Insufficient balance');
      }

      // Get swap transaction data from 1inch
      const swapData = await this.getSwapTransactionData(request);
      
      // Execute the transaction
      const tx = await this.wallet.sendTransaction(swapData);
      const receipt = await tx.wait();

      if (!receipt) {
        throw new Error('Transaction not mined or was replaced.');
      }

      return {
        transactionHash: tx.hash,
        fromAmount: amount,
        toAmount: '0', // Will be updated after transaction confirmation
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
      return true; // ETH needs to be swapped to stablecoin
    }

    // Check if it's a common stablecoin
    const commonStablecoins = [
      '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
      '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', // USDT
    ];

    return !commonStablecoins.includes(tokenAddress);
  }

  // Get best stablecoin to swap to
  getBestStablecoin(): string {
    // Return USDC as the preferred stablecoin for offramp
    return '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base USDC
  }
}
