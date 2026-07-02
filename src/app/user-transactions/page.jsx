'use client';

import dynamic from 'next/dynamic';

const UserTransactions = dynamic(() => import('../../components/UserTransactions'), { ssr: false });

export default function Page() {
  return <UserTransactions />;
}
