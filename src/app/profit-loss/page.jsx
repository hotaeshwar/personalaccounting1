'use client';

import dynamic from 'next/dynamic';

const ProfitLoss = dynamic(() => import('../../components/ProfitLoss'), { ssr: false });

export default function Page() {
  return <ProfitLoss />;
}
