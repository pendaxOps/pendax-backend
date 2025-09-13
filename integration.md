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
      "name": "Access Bank",
      "code": "ABNGNGLA",
      "type": "bank"
    },
    {
      "name": "Diamond Bank",
      "code": "DBLNNGLA",
      "type": "bank"
    },
    {
      "name": "Fidelity Bank",
      "code": "FIDTNGLA",
      "type": "bank"
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
    "institution": "OPAYNGPC",
    "accountIdentifier": "8131972397"
}
```

**Response:**
```json
{
    "success": true,
    "data": "DARE ISREAL AFOLABI",
    "message": "Account name was fetched successfully"
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
  "data": {
    "rate": 1488.68
  }
}
```

## 4. Create Order  **OFFRAMP**
**POST** `/api/offramp/createOrder`

**This is the primary endpoint for creating offramp transactions.** It handles the complete order preparation process:

- ✅ **Gets Exchange Rate**: Fetches current USDC/USDT to NGN rate from Paycrest
- ✅ **Verifies Bank Account**: Validates account number and gets account holder name
- ✅ **Creates Database Record**: Inserts pending transaction with status 'pending'
- ✅ **Generates Blockchain Data**: Creates transaction data for TWO blockchain transactions:
  - **Approval Transaction**: ERC20 approve() call to allow gateway to spend tokens
  - **Create Order Transaction**: Gateway createOrder() call to transfer tokens and create order
- ✅ **Returns Complete Data**: All information needed for frontend to execute transactions

**This endpoint PREPARES the order but doesn't execute it. The frontend must execute the blockchain transactions.**

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
    "rate96": "149958",
    "messageHash": "RUy9BchVU6rzufOiT4HD1B8I6XJO++N9zqe1p22WgF6koyu+IEJAIp+eVahkTWfyXMfFEDWdcTgdeyQd/Z6M1XILHElSJgZzlrq8TPLJbvCMPZdbAsi9u2Si/kAYLhm4cOgfkHWD6o4eGosjSsDqwjIKW99a3XXtDjCbnffNz/w1t75kuL7fabFHz3R+BPMz9YTj30FTA4lQdoQ0Bt4GNbtR/+/Leh5MVK4H4mF2i4sMk81DTmTA5SAbdNSaK9umPwimWv9DMoPeH21n97KU09qgHsSTOuytsR2xTsO9i+Ttsn3xntEIEj57VbMYRYNl3aWZuHfItjmV4bnFQ75RwQ==",
    "approval": {
      "to": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "data": "0x095ea7b300000000000000000000000030f6a8457f8e42371e204a9c103f2bd42341dd0f0000000000000000000000000000000000000000000000000000000005f5e100"
    },
    "createOrder": {
      "to": "0x30F6A8457F8E42371E204a9c103f2Bd42341dD0F",
      "data": "0x809804f7000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda029130000000000000000000000000000000000000000000000000000000005f5e10000000000000000000000000000000000000000000000000000000000000249c600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa9604500000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000015852557939426368565536727a75664f69543448443142384936584a4f2b2b4e397a716531703232576746366b6f79752b49454a4149702b655661686b54576679584d66464544576463546764657951642f5a364d3158494c48456c534a675a7a6c72713854504c4a6276434d505a646241736939753253692f6b41594c686d34634f67666b485744366f3465476f736a53734471776a494b5739396133585874446a43626e66664e7a2f77317437356b754c3766616246487a33522b42504d7a3959546a3330465441346c51646f5130427434474e6274522f2b2f4c6568354d564b3448346d46326934734d6b383144546d544135534162644e53614b39756d5077696d577639444d6f50654832316e39374b5530397167487353544f7579747352327854734f39692b5474736e33786e744549456a353756624d5952594e6c3361575a75486649746a6d5634626e465137355277513d3d0000000000000000"
    },
    "transactionId": "15926229-7a45-45e6-bcbd-80c123f98093"
  }
}
```

**Response Fields Explained:**
- `tokenAddress`: USDC/USDT contract address on Base network
- `gatewayAddress`: Paycrest Gateway contract address
- `amountWei`: Amount in wei (100 USDC = 100000000 wei)
- `rate96`: Exchange rate in 96-bit format (149958 = ~1499.58 NGN per USDC)
- `messageHash`: Encrypted recipient data for the order
- `approval`: Transaction data for ERC20 approve() call
- `createOrder`: Transaction data for gateway createOrder() call
- `transactionId`: Database transaction ID for tracking

**Important**: After getting this response, the user must sign TWO transactions:
1. **Approval Transaction** (`approval`) - Approves the smart contract to spend their USDC/USDT tokens
2. **Create Order Transaction** (`createOrder`) - Creates the offramp order and transfers tokens to the gateway contract

The webhook will automatically update the transaction status when the order is processed.

**Note**: The transaction is automatically tracked via webhooks. No additional API calls are needed after executing the blockchain transactions.

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
5. **Execute Blockchain Transactions**: User signs TWO transactions in wallet:
   - **Approval**: Allows smart contract to spend tokens
   - **Create Order**: Transfers tokens and creates offramp order
6. **Automatic Tracking**: Webhook automatically updates transaction status when order is processed
7. **Track Status**: Monitor transaction progress via API endpoints

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

  // 4. Create order - MAIN ENDPOINT ⭐ (PREPARES transactions)
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

  // 5. Execute blockchain transactions (using Web3/MetaMask)
  async executeTransactions(orderData, userWallet) {
    // Transaction 1: Approve smart contract to spend USDC/USDT tokens
    const approvalTx = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [{ from: userWallet, to: orderData.approval.to, data: orderData.approval.data }]
    });

    // Transaction 2: Create offramp order and transfer tokens to gateway
    const orderTx = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [{ from: userWallet, to: orderData.createOrder.to, data: orderData.createOrder.data }]
    });

    return { approvalTx, orderTx };
  }

  // 6. Check transaction status (webhook updates automatically)
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
    console.log(`Rate: ${rate.data.rate} NGN per ${token}`);

    // 3. Create order - MAIN ENDPOINT ⭐ (PREPARES transactions)
    const orderData = await offramp.createOrder(amount, token, {
      institution: bankCode,
      accountIdentifier: accountNumber,
      currency: 'NGN'
    }, userWallet);

    if (!orderData.success) throw new Error('Failed to create order');

    // 4. Execute TWO blockchain transactions (using Web3/MetaMask)
    const { approvalTx, orderTx } = await offramp.executeTransactions(orderData.data, userWallet);

    // 5. Transaction is automatically tracked via webhook
    console.log('✅ Both transactions executed successfully!');
    console.log(`Approval TX: ${approvalTx}`);
    console.log(`Order TX: ${orderTx}`);
    console.log(`Transaction ID: ${orderData.data.transactionId}`);
    
    return { 
      success: true, 
      transactionId: orderData.data.transactionId,
      approvalTx,
      orderTx 
    };

  } catch (error) {
    console.error('❌ Offramp failed:', error);
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
