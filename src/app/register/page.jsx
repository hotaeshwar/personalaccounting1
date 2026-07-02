'use client';

import dynamic from 'next/dynamic';

const Register = dynamic(() => import('../../components/Register'), { ssr: false });

export default function Page() {
  return <Register />;
}
