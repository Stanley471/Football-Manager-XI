import MatchResultClient from './client';
import { Suspense } from 'react';

export const instant = false;

export default async function MatchResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<div>Loading match details...</div>}>
      <MatchResultClient id={id} />
    </Suspense>
  );
}
