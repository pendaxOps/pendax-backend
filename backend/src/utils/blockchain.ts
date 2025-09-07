import { ethers } from 'ethers';

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
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base USDC
  USDT: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', // Base USDT
  DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'   // Base DAI
};

export const ETH_ADDRESS = '0x0000000000000000000000000000000000000000';


export function getProvider(network: 'base' | 'sepolia' = 'base'): ethers.JsonRpcProvider {
  const networkConfig = NETWORKS[network];
  return new ethers.JsonRpcProvider(networkConfig.rpcUrl);
}


export function createWallet(privateKey: string, network: 'base' | 'sepolia' = 'base'): ethers.Wallet {
  const provider = getProvider(network);
  return new ethers.Wallet(privateKey, provider);
}

export async function getTokenBalance(
  address: string, 
  tokenAddress: string = ETH_ADDRESS,
  network: 'base' | 'sepolia' = 'base'
): Promise<string> {
  const provider = getProvider(network);
  
  if (tokenAddress === ETH_ADDRESS) {
    // Native ETH balance
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  } else {
    // ERC-20 token balance
    const contract = new ethers.Contract(tokenAddress, [
      'function balanceOf(address) view returns (uint256)',
      'function decimals() view returns (uint8)'
    ], provider);
    
    const [balance, decimals] = await Promise.all([
      contract.balanceOf(address),
      contract.decimals()
    ]);
    
    return ethers.formatUnits(balance, decimals);
  }
}


export function isStablecoin(tokenAddress: string): boolean {
  // Check against common stablecoins, but allow any token
  return Object.values(COMMON_STABLECOINS).includes(tokenAddress);
}

export async function getTokenInfo(
  tokenAddress: string,
  network: 'base' | 'sepolia' = 'base'
): Promise<{ symbol: string; decimals: number; name: string }> {
  const provider = getProvider(network);
  
  if (tokenAddress === ETH_ADDRESS) {
    return {
      symbol: 'ETH',
      decimals: 18,
      name: 'Ethereum'
    };
  }
  
  const contract = new ethers.Contract(tokenAddress, [
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function name() view returns (string)'
  ], provider);
  
  const [symbol, decimals, name] = await Promise.all([
    contract.symbol(),
    contract.decimals(),
    contract.name()
  ]);
  
  return { symbol, decimals, name };
}

export function isValidAddress(address: string): boolean {
  return ethers.isAddress(address);
}