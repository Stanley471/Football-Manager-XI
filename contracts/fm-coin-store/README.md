# Football Manager XI - FM Coin Store Contract

This directory contains the Soroban smart contract for processing FM Coin purchases using Stellar (e.g., via USDC).

## Architecture & Payment Flow

This contract **does NOT mint or store FM Coins on-chain**. FM Coins are an entirely off-chain, closed-loop currency managed by the Football Manager XI Express backend and PostgreSQL database.

This Soroban contract merely acts as a verified checkout store.

**The intended payment flow is:**

1. **Stellar Payment:** A user calls `purchase(package_id)` on this Soroban contract, sending the configured USDC amount from their wallet to the project treasury.
2. **Transaction Hash:** The user's client receives the completed Stellar transaction hash.
3. **Express Verification:** The client sends the transaction hash to the Football Manager XI Express backend.
4. **Validation:** The backend queries the Stellar network, verifies that this exact contract was invoked, the correct event was emitted, and that the transaction hasn't been credited yet.
5. **Off-Chain Credit:** The backend creates a `STELLAR_PURCHASE` record in PostgreSQL and credits the off-chain FM Coins to the user's club.

## Contract Features

*   **Configurable Packages:** The contract supports predefined packages (Starter, Popular, Big, Mega).
*   **Admin Controls:** The admin can dynamically set the USDC price for each package before or during testnet.
*   **Treasury Forwarding:** All token payments are automatically routed to the configured treasury address.
*   **Purchase Records:** Successful purchases emit a `purchase` event containing the package ID, amount paid, and FM Coins expected.

## How to Build and Test

This contract is built using the standard Soroban SDK.

**Run Unit Tests:**
```bash
cargo test
```

**Build for WebAssembly (WASM):**
```bash
stellar contract build
# Or using cargo directly if stellar-cli isn't installed globally:
cargo build --target wasm32-unknown-unknown --release
```

## Security Assumptions

*   **No Arbitrary Pricing:** Users cannot pass arbitrary USDC amounts or FM Coin amounts. Everything is strictly mapped via `PackageId`.
*   **Admin Auth:** Only the authenticated `admin` can call `set_price`.
*   **Buyer Auth:** `buyer.require_auth()` ensures the caller has signed the transaction authorizing the token deduction.

## Note for Local Development

Do not use real USDC or deploy this to Mainnet during the current MVP phase. Local tests mock the authentication and token clients automatically using `soroban-sdk::testutils`.
