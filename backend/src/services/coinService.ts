import prisma from '../lib/prisma';
import { Prisma } from '@prisma/client';

export type TxClient = Omit<Prisma.TransactionClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

export async function creditCoins(
  clubId: string, 
  amount: number, 
  type: string, 
  description: string, 
  referenceId?: string, 
  tx?: TxClient
) {
  const db = tx || prisma;
  return db.club.update({
    where: { id: clubId },
    data: {
      balance: { increment: amount },
      transactions: {
        create: {
          amount,
          type,
          description,
          referenceId
        }
      }
    }
  });
}

export async function debitCoins(
  clubId: string, 
  amount: number, 
  type: string, 
  description: string, 
  referenceId?: string, 
  tx?: TxClient
) {
  const db = tx || prisma;
  
  // We must ensure balance does not go below 0
  const club = await db.club.findUnique({
    where: { id: clubId },
    select: { balance: true }
  });

  if (!club || club.balance < amount) {
    throw new Error('Insufficient FM Coins');
  }

  return db.club.update({
    where: { id: clubId },
    data: {
      balance: { decrement: amount },
      transactions: {
        create: {
          amount: -amount,
          type,
          description,
          referenceId
        }
      }
    }
  });
}

export async function getBalance(clubId: string) {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { balance: true }
  });
  if (!club) throw new Error('Club not found');
  return club.balance;
}

export async function getTransactions(clubId: string) {
  return prisma.coinTransaction.findMany({
    where: { clubId },
    orderBy: { createdAt: 'desc' }
  });
}
