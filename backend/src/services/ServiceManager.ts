import { OfframpService } from './OfframpService';
import { TransactionService } from './TransactionService';

export class ServiceManager {
  private static instance: ServiceManager;
  private offrampService!: OfframpService;
  private transactionService!: TransactionService;
  private initialized = false;

  private constructor() {}

  static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager();
    }
    return ServiceManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('🚀 Initializing services...');
      
      this.offrampService = new OfframpService();
      this.transactionService = new TransactionService();
      
      this.initialized = true;
      console.log('✅ All services initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize services:', error);
      throw error;
    }
  }

  getOfframpService(): OfframpService {
    this.ensureInitialized();
    return this.offrampService;
  }

  getTransactionService(): TransactionService {
    this.ensureInitialized();
    return this.transactionService;
  }


  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Services not initialized. Call initialize() first.');
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      return this.initialized;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}
