# Pendax Offramp API

**Frontend Integration Guide**

This API allows users to convert cryptocurrency (USDC/USDT) to fiat currency (NGN) through supported Nigerian banks.

## Base URL
- **Development**: `http://localhost:3000`
- **Production**: `https://your-production-domain.com`

## API Endpoints

## 1. Get Supported Banks
**GET** `/api/offramp/institutions/NGN`

Returns list of supported Nigerian banks for NGN transfers.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "code": "044",
      "name": "Access Bank"
    },
    {
      "code": "014",
      "name": "Afribank Nigeria Plc"
    }
  ]
}
```

## 2. Verify Bank Account
**POST** `/api/offramp/verify-account`

Verify if a bank account number is valid and get the account holder's name.

**Body:**
```json
{
  "institution": "044",
  "accountIdentifier": "1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "data": "JOHN DOE"
}
```

## 3. Get Exchange Rate
**GET** `/api/offramp/rate/{token}/{amount}/NGN?network=base`

Get the current exchange rate for converting crypto to NGN.

**Example:** `/api/offramp/rate/USDC/100/NGN?network=base`

**Response:**
```json
{
  "success": true,
  "data": "150000"
}
```

## 4. Create Order ⭐ **MAIN ENDPOINT**
**POST** `/api/offramp/createOrder`

**This is the primary endpoint for creating offramp transactions.** It handles the complete order creation process:

- Validates the request and gets exchange rate
- Verifies the bank account and gets account holder name
- Creates blockchain transaction data for approval and order creation
- Creates a transaction record in database with status 'pending'
- Returns all data needed for blockchain interaction

**This endpoint is the core of the offramp functionality - all other endpoints support this main flow.**

**Body:**
```json
{
  "amount": "100",
  "token": "USDC",
  "network": "base",
  "recipient": {
    "institution": "044",
    "accountIdentifier": "1234567890",
    "currency": "NGN"
  },
  "refundAddress": "0x1234..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tokenAddress": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "gatewayAddress": "0x30F6A8457F8E42371E204a9c103f2Bd42341dD0F",
    "amountWei": "100000000",
    "rate96": "15000000",
    "messageHash": "encrypted_recipient_data",
    "approval": {
      "to": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "data": "0x095ea7b300000000000000000000000030f6a8457f8e42371e204a9c103f2b..."
    },
    "createOrder": {
      "to": "0x30F6A8457F8E42371E204a9c103f2Bd42341dD0F",
      "data": "0x1234567890abcdef..."
    },
    "transactionId": "tx_123456789"
  }
}
```

**Important**: After getting this response, you need to:
1. Execute the `approval` transaction first (to approve token spending)
2. Execute the `createOrder` transaction (to create the offramp order)
3. Submit the transaction hash using the `/updateDB` endpoint

## 5. Update Database
**POST** `/api/offramp/updateDB`

Submit blockchain transaction details after the user has executed the blockchain transactions. This updates the transaction status to 'processing' and stores the blockchain transaction hash.

**Body:**
```json
{
  "transactionId": "tx_123456789",
  "txHash": "0xabcdef123456...",
  "orderId": "order_123456789"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transaction submitted successfully",
  "data": {
    "transactionId": "tx_123456789",
    "txHash": "0xabcdef123456...",
    "orderId": "order_123456789"
  }
}
```

## 6. Get Transaction Status
**GET** `/api/offramp/transaction/{id}`

Check the status of a specific transaction.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "tx_123456789",
    "status": "completed",
    "amount": "100",
    "token": "USDC",
    "recipient": {
      "institution": "044",
      "accountIdentifier": "1234567890",
      "accountName": "JOHN DOE"
    },
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

## 7. Get User Transactions
**GET** `/api/offramp/transactions/{walletAddress}?limit=20&offset=0`

Get all transactions for a specific wallet address.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "tx_123456789",
      "status": "completed",
      "amount": "100",
      "token": "USDC",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

## Frontend Integration Flow

### Step-by-Step Implementation

1. **Load Banks**: Fetch supported banks for user selection
2. **Verify Account**: Validate bank account before proceeding
3. **Get Rate**: Show current exchange rate to user
4. **⭐ Create Order**: **MAIN ENDPOINT** - Get blockchain transaction data (creates transaction in database)
5. **Execute Blockchain Transactions**: User signs approval + createOrder transactions in wallet
6. **Update Database**: Send transaction hash to API (updates database with blockchain details)
7. **Track Status**: Monitor transaction progress

### Complete Example

```javascript
class PendaxOfframp {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  // 1. Get supported banks
  async getBanks() {
    const response = await fetch(`${this.baseUrl}/api/offramp/institutions/NGN`);
    return response.json();
  }

  // 2. Verify bank account
  async verifyAccount(bankCode, accountNumber) {
    const response = await fetch(`${this.baseUrl}/api/offramp/verify-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        institution: bankCode,
        accountIdentifier: accountNumber
      })
    });
    return response.json();
  }

  // 3. Get exchange rate
  async getRate(token, amount) {
    const response = await fetch(`${this.baseUrl}/api/offramp/rate/${token}/${amount}/NGN?network=base`);
    return response.json();
  }

  // 4. Create order - MAIN ENDPOINT ⭐
  async createOrder(amount, token, recipient, refundAddress) {
    const response = await fetch(`${this.baseUrl}/api/offramp/createOrder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        token,
        network: 'base',
        recipient,
        refundAddress
      })
    });
    return response.json();
  }

  // 5. Update database after blockchain confirmation
  async updateDatabase(transactionId, txHash, orderId) {
    const response = await fetch(`${this.baseUrl}/api/offramp/updateDB`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactionId,
        txHash,
        orderId
      })
    });
    return response.json();
  }

  // 6. Check transaction status
  async getTransactionStatus(transactionId) {
    const response = await fetch(`${this.baseUrl}/api/offramp/transaction/${transactionId}`);
    return response.json();
  }

  // 7. Get user's transaction history
  async getUserTransactions(walletAddress, limit = 20, offset = 0) {
    const response = await fetch(`${this.baseUrl}/api/offramp/transactions/${walletAddress}?limit=${limit}&offset=${offset}`);
    return response.json();
  }
}

// Usage example
const offramp = new PendaxOfframp('https://your-api-domain.com');

// Complete flow
async function processOfframp(userWallet, amount, token, bankCode, accountNumber) {
  try {
    // 1. Verify account
    const verification = await offramp.verifyAccount(bankCode, accountNumber);
    if (!verification.success) throw new Error('Invalid account');

    // 2. Get rate
    const rate = await offramp.getRate(token, amount);
    console.log(`Rate: ${rate.data} NGN`);

    // 3. Create order - MAIN ENDPOINT ⭐
    const prep = await offramp.createOrder(amount, token, {
      institution: bankCode,
      accountIdentifier: accountNumber,
      currency: 'NGN'
    }, userWallet);

    if (!prep.success) throw new Error('Failed to create order');

    // 4. Execute blockchain transaction (using Web3)
    const { approval, createOrder, transactionId } = prep.data;
    
    // First approve token spending
    const approveTx = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [{ from: userWallet, to: approval.to, data: approval.data }]
    });

    // Then create the order
    const orderTx = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [{ from: userWallet, to: createOrder.to, data: createOrder.data }]
    });

    // 5. Update database with transaction details
    const submit = await offramp.updateDatabase(transactionId, orderTx, orderTx);
    
    console.log('Transaction submitted:', submit);
    return { success: true, transactionId, orderTx };

  } catch (error) {
    console.error('Offramp failed:', error);
    return { success: false, error: error.message };
  }
}
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message description"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request (missing/invalid parameters)
- `404` - Not Found
- `500` - Internal Server Error
