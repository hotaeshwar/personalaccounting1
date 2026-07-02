'use client';

import dynamic from 'next/dynamic';

const ExpenseList = dynamic(() => import('../../components/ExpenseList'), { ssr: false });

export default function Page() {
  return <ExpenseList />;
}
