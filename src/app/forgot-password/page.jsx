'use client';

import dynamic from 'next/dynamic';

const ForgotPassword = dynamic(() => import('../../components/ForgotPassword'), { ssr: false });

export default function Page() {
  return <ForgotPassword />;
}
