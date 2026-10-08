
## Stellar FM Coin Verification

This backend now includes a secure Stellar verification service to process FM Coin purchases made via the Soroban FM Coin Store contract on the Stellar network. 

### Architecture Flow
User -> Stellar wallet -> Soroban FM Coin Store -> USDC payment -> Stellar transaction -> POST `/stellar/purchases/verify` -> Stellar RPC verification -> PostgreSQL transaction -> `STELLAR_PURCHASE` (idempotent) -> FM Coins credited.

### Idempotency Strategy
The backend safely enforces idempotency using the Stellar `transactionHash`. When a hash is submitted:
1. We check if the hash exists in the `StellarPurchase` table.
2. If yes, we return the successful result without crediting FM Coins again.
3. If no, we fetch the hash from the Stellar network, verify its success, and verify all contract execution data (contract ID, payment token, treasury, package ID).
4. Only then, in an atomic database transaction, the purchase record is created and FM Coins are added to the Club.

### Why frontend payment data is never trusted
The client only submits the `transactionHash`. Any information about the "amount paid", "USDC sent", or "package selected" provided directly by the frontend could be spoofed. The backend solely relies on parsing the verified contract events returned by the Stellar RPC to derive the payment parameters and verify correctness.

### Why FM Coins remain off-chain
To keep database game mechanics fast, avoid gas fees on every tiny in-game action, and minimize latency during matchmaking/transfers, FM Coins are credited to an off-chain ledger within PostgreSQL. 

### Environment Setup
Make sure the following variables are in your `.env`:
- `STELLAR_NETWORK`
- `STELLAR_RPC_URL`
- `STELLAR_FM_COIN_STORE_CONTRACT_ID`
- `STELLAR_USDC_CONTRACT_ID`
- `STELLAR_TREASURY_ADDRESS`
