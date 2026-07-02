'use client';

import dynamic from 'next/dynamic';

const IncomeForm = dynamic(() => import('../../components/IncomeForm'), { ssr: false });

export default function Page() {
  return <IncomeForm />;
}
