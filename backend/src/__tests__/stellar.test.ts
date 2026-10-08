import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StellarVerificationService } from '../services/stellarVerificationService';
import { prisma } from '../lib/prisma';
import { rpc } from '@stellar/stellar-sdk';

const VALID_TX_HASH = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const VALID_CLUB_ID = 'test-club-123';

const MOCK_VALID_DATA = {
  contractId: 'CD...',
  paymentToken: 'CD...',
  treasuryAddress: 'G...',
  buyerAddress: 'G_BUYER...',
  packageId: 'premium-pack',
  paymentAmount: '10000000',
  fmCoinAmount: 500,
};

// We will mock process.env for these tests
process.env.STELLAR_FM_COIN_STORE_CONTRACT_ID = 'CD...';
process.env.STELLAR_USDC_CONTRACT_ID = 'CD...';
process.env.STELLAR_TREASURY_ADDRESS = 'G...';

describe('StellarVerificationService', () => {
  let service: StellarVerificationService;

  beforeEach(() => {
    service = new StellarVerificationService();
    // Clear all stellar purchases and clubs before each test
    // Actually, it's better to just mock prisma for these unit tests 
    // to strictly verify the logic without needing a DB connection in tests.
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchAndVerifyTransaction', () => {
    it('15. should validate transaction hash format', async () => {
      await expect(service.verifyAndCreditPurchase(VALID_CLUB_ID, 'invalid-hash')).rejects.toThrow('Invalid transaction hash format');
    });

    it('14. should handle Internal Stellar RPC failure', async () => {
      vi.spyOn(service['rpcServer'], 'getTransaction').mockRejectedValue(new Error('Network Error'));
      await expect(service.fetchAndVerifyTransaction(VALID_TX_HASH)).rejects.toThrow('Internal Stellar RPC failure: Network Error');
    });

    it('3. should reject unknown transaction', async () => {
      vi.spyOn(service['rpcServer'], 'getTransaction').mockResolvedValue({
        status: rpc.Api.GetTransactionStatus.NOT_FOUND
      } as any);
      await expect(service.fetchAndVerifyTransaction(VALID_TX_HASH)).rejects.toThrow('Transaction not found');
    });

    it('2. should reject failed transaction', async () => {
      vi.spyOn(service['rpcServer'], 'getTransaction').mockResolvedValue({
        status: rpc.Api.GetTransactionStatus.FAILED
      } as any);
      await expect(service.fetchAndVerifyTransaction(VALID_TX_HASH)).rejects.toThrow('Transaction failed or pending');
    });

    it('4. should reject pending transaction', async () => {
      vi.spyOn(service['rpcServer'], 'getTransaction').mockResolvedValue({
        // Any non-success non-not-found is considered pending or failed
        status: 'PENDING'
      } as any);
      await expect(service.fetchAndVerifyTransaction(VALID_TX_HASH)).rejects.toThrow('Transaction failed or pending');
    });

    it('10. should reject malformed contract purchase data/event', async () => {
      vi.spyOn(service['rpcServer'], 'getTransaction').mockResolvedValue({
        status: rpc.Api.GetTransactionStatus.SUCCESS
      } as any); // no _mockPurchaseData
      
      await expect(service.fetchAndVerifyTransaction(VALID_TX_HASH)).rejects.toThrow('Malformed/missing contract event');
    });

    it('5. should reject wrong contract', async () => {
      vi.spyOn(service['rpcServer'], 'getTransaction').mockResolvedValue({
        status: rpc.Api.GetTransactionStatus.SUCCESS,
        _mockPurchaseData: { ...MOCK_VALID_DATA, contractId: 'WRONG_CONTRACT' }
      } as any);
      
      await expect(service.fetchAndVerifyTransaction(VALID_TX_HASH)).rejects.toThrow('Wrong contract');
    });

    it('6. should reject wrong payment token', async () => {
      vi.spyOn(service['rpcServer'], 'getTransaction').mockResolvedValue({
        status: rpc.Api.GetTransactionStatus.SUCCESS,
        _mockPurchaseData: { ...MOCK_VALID_DATA, paymentToken: 'WRONG_TOKEN' }
      } as any);
      
      await expect(service.fetchAndVerifyTransaction(VALID_TX_HASH)).rejects.toThrow('Wrong payment token');
    });

    it('7. should reject wrong treasury', async () => {
      vi.spyOn(service['rpcServer'], 'getTransaction').mockResolvedValue({
        status: rpc.Api.GetTransactionStatus.SUCCESS,
        _mockPurchaseData: { ...MOCK_VALID_DATA, treasuryAddress: 'WRONG_TREASURY' }
      } as any);
      
      await expect(service.fetchAndVerifyTransaction(VALID_TX_HASH)).rejects.toThrow('Wrong treasury');
    });

    it('9. should reject invalid package', async () => {
      vi.spyOn(service['rpcServer'], 'getTransaction').mockResolvedValue({
        status: rpc.Api.GetTransactionStatus.SUCCESS,
        _mockPurchaseData: { ...MOCK_VALID_DATA, packageId: '' }
      } as any);
      
      await expect(service.fetchAndVerifyTransaction(VALID_TX_HASH)).rejects.toThrow('Invalid package');
    });

    it('8. should reject wrong payment amount', async () => {
      vi.spyOn(service['rpcServer'], 'getTransaction').mockResolvedValue({
        status: rpc.Api.GetTransactionStatus.SUCCESS,
        _mockPurchaseData: { ...MOCK_VALID_DATA, paymentAmount: '0' }
      } as any);
      
      await expect(service.fetchAndVerifyTransaction(VALID_TX_HASH)).rejects.toThrow('Wrong payment amount');
    });

    it('1. should succeed with valid data', async () => {
      vi.spyOn(service['rpcServer'], 'getTransaction').mockResolvedValue({
        status: rpc.Api.GetTransactionStatus.SUCCESS,
        latestLedger: 12345,
        _mockPurchaseData: { ...MOCK_VALID_DATA }
      } as any);
      
      const result = await service.fetchAndVerifyTransaction(VALID_TX_HASH);
      expect(result.fmCoinAmount).toBe(500);
      expect(result.packageId).toBe('premium-pack');
    });
  });

  describe('verifyAndCreditPurchase', () => {
    // 11. First verification credits FM Coins
    it('11. should credit FM coins for a new valid purchase', async () => {
      vi.spyOn(prisma.stellarPurchase, 'findUnique').mockResolvedValue(null);
      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        // Mock the internal tx object
        const tx = {
          stellarPurchase: {
            findUnique: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({ id: 'purchase-1' })
          },
          club: {
            update: vi.fn().mockResolvedValue({})
          }
        };
        return cb(tx);
      });
      vi.spyOn(service, 'fetchAndVerifyTransaction').mockResolvedValue({
         transactionHash: VALID_TX_HASH,
         buyerAddress: 'G_BUYER...',
         packageId: 'premium-pack',
         paymentToken: 'CD...',
         paymentAmount: '10000000',
         fmCoinAmount: 500,
         treasuryAddress: 'G...',
         ledger: 12345
      });

      const res = await service.verifyAndCreditPurchase(VALID_CLUB_ID, VALID_TX_HASH);
      expect(res.id).toBe('purchase-1');
      expect(service.fetchAndVerifyTransaction).toHaveBeenCalledWith(VALID_TX_HASH);
    });

    it('12. should return existing purchase without crediting twice', async () => {
      vi.spyOn(prisma.stellarPurchase, 'findUnique').mockResolvedValue({
        id: 'existing-id',
        clubId: VALID_CLUB_ID,
        transactionHash: VALID_TX_HASH,
        packageId: 'pack',
        paymentAmount: '100',
        paymentToken: 'token',
        fmCoinAmount: 500,
        treasuryAddress: 'G',
        status: 'SUCCESS',
        createdAt: new Date()
      } as any);
      
      const txSpy = vi.spyOn(prisma, '$transaction').mockResolvedValue({} as any);
      
      const res = await service.verifyAndCreditPurchase(VALID_CLUB_ID, VALID_TX_HASH);
      expect(res.id).toBe('existing-id');
      expect(txSpy).not.toHaveBeenCalled();
    });

    it('13. should handle database rollback if coin credit fails', async () => {
       // A realistic way to test Prisma transaction rollback is to throw inside it
       vi.spyOn(prisma.stellarPurchase, 'findUnique').mockResolvedValue(null);
       const txMock = vi.fn().mockImplementation(async (cb: any) => {
         const tx = {
           stellarPurchase: {
             findUnique: vi.fn().mockResolvedValue(null),
             create: vi.fn().mockResolvedValue({ id: 'purchase-1' })
           },
           club: {
             update: vi.fn().mockRejectedValue(new Error('DB Update Failed'))
           }
         };
         return cb(tx); // Should bubble up the error, simulating rollback
       });
       // Type hack for mocking transaction
       prisma.$transaction = txMock as any;

       vi.spyOn(service, 'fetchAndVerifyTransaction').mockResolvedValue({
         transactionHash: VALID_TX_HASH,
         buyerAddress: 'G_BUYER...',
         packageId: 'premium-pack',
         paymentToken: 'CD...',
         paymentAmount: '10000000',
         fmCoinAmount: 500,
         treasuryAddress: 'G...',
         ledger: 12345
      });

      await expect(service.verifyAndCreditPurchase(VALID_CLUB_ID, VALID_TX_HASH)).rejects.toThrow('DB Update Failed');
    });
  });
});
