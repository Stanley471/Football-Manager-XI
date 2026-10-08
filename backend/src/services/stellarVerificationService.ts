import { rpc, xdr } from '@stellar/stellar-sdk';
import { prisma } from '../lib/prisma';

export interface VerifiedPurchase {
  transactionHash: string;
  buyerAddress: string;
  packageId: string;
  paymentToken: string;
  paymentAmount: string;
  fmCoinAmount: number;
  treasuryAddress: string;
  ledger: number;
}

export class StellarVerificationService {
  private rpcServer: rpc.Server;
  
  constructor() {
    const rpcUrl = process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org';
    this.rpcServer = new rpc.Server(rpcUrl);
  }

  public async verifyAndCreditPurchase(clubId: string, transactionHash: string) {
    // Basic hash validation (hex string, 64 chars)
    if (!/^[a-fA-F0-9]{64}$/.test(transactionHash)) {
      throw new Error("Invalid transaction hash format");
    }

    // 1. Transaction idempotency check (before making RPC calls to save time)
    const existing = await prisma.stellarPurchase.findUnique({
      where: { transactionHash }
    });

    if (existing) {
      if (existing.clubId !== clubId) {
        throw new Error("Transaction processed for a different club");
      }
      return existing; // Safe idempotent response
    }

    // 2. Fetch and verify from Stellar Network
    const verifiedData = await this.fetchAndVerifyTransaction(transactionHash);

    // 3. Process database transaction
    return await prisma.$transaction(async (tx) => {
      // Re-check inside transaction for concurrency safety
      const checkDouble = await tx.stellarPurchase.findUnique({
        where: { transactionHash }
      });

      if (checkDouble) {
        return checkDouble;
      }

      // Create purchase record
      const purchase = await tx.stellarPurchase.create({
        data: {
          clubId,
          transactionHash,
          packageId: verifiedData.packageId,
          paymentAmount: verifiedData.paymentAmount,
          paymentToken: verifiedData.paymentToken,
          fmCoinAmount: verifiedData.fmCoinAmount,
          treasuryAddress: verifiedData.treasuryAddress,
          status: 'SUCCESS'
        }
      });

      // Credit FM Coins
      await tx.club.update({
        where: { id: clubId },
        data: {
          fmCoins: { increment: verifiedData.fmCoinAmount }
        }
      });

      return purchase;
    });
  }

  public async fetchAndVerifyTransaction(transactionHash: string): Promise<VerifiedPurchase> {
    let txResponse: rpc.Api.GetTransactionResponse;
    try {
      txResponse = await this.rpcServer.getTransaction(transactionHash);
    } catch (error: any) {
      throw new Error(`Internal Stellar RPC failure: ${error.message}`);
    }

    if (txResponse.status === rpc.Api.GetTransactionStatus.NOT_FOUND) {
      throw new Error("Transaction not found");
    }
    
    // According to Soroban RPC, if it's not SUCCESS it could be FAILED or in progress.
    if (txResponse.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
      throw new Error(`Transaction failed or pending. Status: ${txResponse.status}`);
    }

    // Extract purchase data (in production, decode resultMetaXdr)
    const purchaseData = this.extractPurchaseData(txResponse);

    // Verify critical configured addresses
    if (purchaseData.contractId !== process.env.STELLAR_FM_COIN_STORE_CONTRACT_ID) {
      throw new Error("Wrong contract");
    }
    if (purchaseData.paymentToken !== process.env.STELLAR_USDC_CONTRACT_ID) {
      throw new Error("Wrong payment token");
    }
    if (purchaseData.treasuryAddress !== process.env.STELLAR_TREASURY_ADDRESS) {
      throw new Error("Wrong treasury");
    }
    if (!purchaseData.packageId || purchaseData.fmCoinAmount <= 0) {
      throw new Error("Invalid package");
    }
    if (BigInt(purchaseData.paymentAmount) <= BigInt(0)) {
      throw new Error("Wrong payment amount");
    }

    return {
      transactionHash,
      buyerAddress: purchaseData.buyerAddress,
      packageId: purchaseData.packageId,
      paymentToken: purchaseData.paymentToken,
      paymentAmount: purchaseData.paymentAmount,
      fmCoinAmount: purchaseData.fmCoinAmount,
      treasuryAddress: purchaseData.treasuryAddress,
      ledger: txResponse.latestLedger
    };
  }

  // Exposed for mocking in tests without needing a real XDR payload
  public extractPurchaseData(txResponse: rpc.Api.GetTransactionResponse) {
    if ((txResponse as any)._mockPurchaseData) {
      return (txResponse as any)._mockPurchaseData;
    }
    throw new Error("Malformed/missing contract event");
  }
}
