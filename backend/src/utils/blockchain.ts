import { createPublicClient, createWalletClient, http, getAddress, parseUnits, formatUnits, zeroAddress } from 'viem';
import { base } from 'viem/chains';

const NETWORKS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpcUrl: 'https://mainnet.base.org'
  },
  sepolia: {
    name: 'Sepolia',
    chainId: 11155111,
    rpcUrl: 'https://sepolia.infura.io/v3/'
  }
};

export const COMMON_STABLECOINS = {
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  USDT: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
  DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
};

export const ETH_ADDRESS = zeroAddress;

// Paycrest Gateway Contract Address (Base Network)
export const PAYCREST_GATEWAY_ADDRESS = '0x30F6A8457F8E42371E204a9c103f2Bd42341dD0F';

export function getPublicClient(network: 'base' | 'sepolia' = 'base') {
  const networkConfig = NETWORKS[network];
  return createPublicClient({
    chain: network === 'base' ? base : undefined,
    transport: http(networkConfig.rpcUrl)
  });
}

export function createWallet(privateKey: `0x${string}`, network: 'base' | 'sepolia' = 'base') {
  const networkConfig = NETWORKS[network];
  return createWalletClient({
    chain: network === 'base' ? base : undefined,
    transport: http(networkConfig.rpcUrl),
    account: privateKey
  });
}

export async function getTokenBalance(
  address: `0x${string}`, 
  tokenAddress: `0x${string}` = ETH_ADDRESS,
  network: 'base' | 'sepolia' = 'base'
): Promise<string> {
  const publicClient = getPublicClient(network);
  
  if (tokenAddress === ETH_ADDRESS) {
    const balance = await publicClient.getBalance({ address });
    return formatUnits(balance, 18);
  } else {
    const [balance, decimals] = await Promise.all([
      publicClient.readContract({
        address: tokenAddress,
        abi: [{
          name: 'balanceOf',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'account', type: 'address' }],
          outputs: [{ name: '', type: 'uint256' }]
        }],
        functionName: 'balanceOf',
        args: [address]
      }),
      publicClient.readContract({
        address: tokenAddress,
        abi: [{
          name: 'decimals',
          type: 'function',
          stateMutability: 'view',
          inputs: [],
          outputs: [{ name: '', type: 'uint8' }]
        }],
        functionName: 'decimals'
      })
    ]);
    
    return formatUnits(balance, decimals);
  }
}

export function isStablecoin(tokenAddress: string): boolean {
  return Object.values(COMMON_STABLECOINS).includes(tokenAddress);
}

export async function getTokenInfo(
  tokenAddress: `0x${string}`,
  network: 'base' | 'sepolia' = 'base'
): Promise<{ symbol: string; decimals: number; name: string }> {
  const publicClient = getPublicClient(network);
  
  if (tokenAddress === ETH_ADDRESS) {
    return {
      symbol: 'ETH',
      decimals: 18,
      name: 'Ethereum'
    };
  }
  
  const [symbol, decimals, name] = await Promise.all([
    publicClient.readContract({
      address: tokenAddress,
      abi: [{
        name: 'symbol',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'string' }]
      }],
      functionName: 'symbol'
    }),
    publicClient.readContract({
      address: tokenAddress,
      abi: [{
        name: 'decimals',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint8' }]
      }],
      functionName: 'decimals'
    }),
    publicClient.readContract({
      address: tokenAddress,
      abi: [{
        name: 'name',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'string' }]
      }],
      functionName: 'name'
    })
  ]);
  
  return { symbol, decimals, name };
}

export function isValidAddress(address: string): boolean {
  try {
    getAddress(address);
    return true;
  } catch {
    return false;
  }
}