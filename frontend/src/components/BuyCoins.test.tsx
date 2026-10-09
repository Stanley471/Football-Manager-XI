/// <reference types="@testing-library/jest-dom" />
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BuyCoins from './BuyCoins';
import * as stellar from '@/lib/stellar';

// Mock the stellar lib
vi.mock('@/lib/stellar', () => ({
  connectWallet: vi.fn(),
  submitPurchaseTransaction: vi.fn()
}));

const mockPackages = [
  { id: 'starter', name: 'Starter', amount: 10000, priceString: 'Configured on Stellar' },
  { id: 'popular', name: 'Popular', amount: 25000, priceString: 'Configured on Stellar' }
];

const mockConfig = {
  network: 'TESTNET',
  rpcUrl: 'http://test',
  contractId: 'C...'
};

describe('BuyCoins Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn((url: string | URL | Request, options?: RequestInit) => {
      if (url.toString().includes('/packages')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockPackages, config: mockConfig })
        } as Response);
      }
      if (url.toString().includes('/verify')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { fmCoinAmount: 10000 } })
        } as Response);
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  it('verifies wallet-not-connected state and connects', async () => {
    vi.mocked(stellar.connectWallet).mockResolvedValueOnce({ connected: false, address: null });
    
    render(<BuyCoins clubId="test-club" onSuccess={() => {}} />);
    
    // Initial load
    expect(await screen.findByText('Starter')).toBeTruthy();
    
    // Check not connected state
    expect(screen.getByText('Connect your Stellar wallet to purchase.')).toBeTruthy();
    
    const connectBtn = screen.getByRole('button', { name: 'Connect Wallet' });
    expect(connectBtn).toBeTruthy();

    // Click connect
    vi.mocked(stellar.connectWallet).mockResolvedValueOnce({ connected: true, address: 'G_TEST_ADDR' });
    fireEvent.click(connectBtn);
    
    await waitFor(() => {
      expect(screen.getByText(/Connected:/)).toBeTruthy();
      expect(screen.getByText(/G_TEST/)).toBeTruthy();
    });
  });

  it('verifies package selection and purchase flow (success)', async () => {
    vi.mocked(stellar.connectWallet).mockResolvedValueOnce({ connected: true, address: 'G_TEST_ADDR' });
    vi.mocked(stellar.submitPurchaseTransaction).mockResolvedValueOnce('fake-hash-123');
    
    const onSuccessMock = vi.fn();
    render(<BuyCoins clubId="test-club" onSuccess={onSuccessMock} />);
    
    expect(await screen.findByText('Starter')).toBeTruthy();
    
    // Select package
    const starterPkg = screen.getByText('Starter');
    fireEvent.click(starterPkg);

    // Buy button should be enabled
    const buyBtn = screen.getByRole('button', { name: 'Buy Package' }) as HTMLButtonElement;
    expect(buyBtn.disabled).toBe(false);
    
    // Click buy
    fireEvent.click(buyBtn);
    
    // Duplicate click protection: button should disable/change text immediately
    expect(buyBtn.textContent).toContain('Signing...');
    expect(buyBtn.disabled).toBe(true);

    // Transaction submission
    await waitFor(() => {
      expect(stellar.submitPurchaseTransaction).toHaveBeenCalledWith('starter', mockConfig, 'G_TEST_ADDR');
    });

    // Verification and success
    await waitFor(() => {
      expect(screen.getByText('Purchase Successful!')).toBeTruthy();
    });
    
    expect(onSuccessMock).toHaveBeenCalledTimes(1);
  });

  it('handles verification failure', async () => {
    vi.mocked(stellar.connectWallet).mockResolvedValueOnce({ connected: true, address: 'G_TEST_ADDR' });
    vi.mocked(stellar.submitPurchaseTransaction).mockResolvedValueOnce('fake-hash-fail');
    
    // Mock fetch to return verify error
    global.fetch = vi.fn((url: string | URL | Request) => {
      if (url.toString().includes('/packages')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockPackages, config: mockConfig })
        } as Response);
      }
      if (url.toString().includes('/verify')) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ success: false, error: 'Failed from backend' })
        } as Response);
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(<BuyCoins clubId="test-club" onSuccess={() => {}} />);
    
    expect(await screen.findByText('Starter')).toBeTruthy();
    
    fireEvent.click(screen.getByText('Starter'));
    const buyBtn = screen.getByRole('button', { name: 'Buy Package' }) as HTMLButtonElement;
    fireEvent.click(buyBtn);

    await waitFor(() => {
      expect(screen.getByText('Failed from backend')).toBeTruthy();
    });
    
    // Should return to READY state
    expect((screen.getByRole('button', { name: 'Buy Package' }) as HTMLButtonElement).disabled).toBe(false);
  });
});
