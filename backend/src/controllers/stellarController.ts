import { Request, Response } from 'express';
import { StellarVerificationService } from '../services/stellarVerificationService';

const stellarService = new StellarVerificationService();

export const verifyPurchase = async (req: Request, res: Response): Promise<void> => {
  const clubId = req.params.clubId as string;
  const { transactionHash } = req.body;

  if (!transactionHash || typeof transactionHash !== 'string') {
    res.status(400).json({ success: false, error: 'Transaction hash is required' });
    return;
  }

  // DEVELOPMENT ASSUMPTION: 
  // No authentication implemented yet. We assume the user has authorization for clubId.
  // FUTURE: Verify authenticated user owns the club, and that the club owns the buyer address.

  try {
    const result = await stellarService.verifyAndCreditPurchase(clubId, transactionHash);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    console.error(`Verification failed for tx ${transactionHash}:`, error.message);
    
    // Determine HTTP status based on error message
    let status = 400;
    if (error.message.includes('not found')) status = 404;
    else if (error.message.includes('Internal Stellar RPC failure')) status = 502;
    
    res.status(status).json({ success: false, error: error.message });
  }
};
