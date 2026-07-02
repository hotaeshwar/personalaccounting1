'use client';

import dynamic from 'next/dynamic';

const ExpenseForm = dynamic(() => import('../../components/ExpenseForm'), { ssr: false });

export default function Page() {
  return <ExpenseForm />;
}
