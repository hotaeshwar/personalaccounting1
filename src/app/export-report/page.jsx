'use client';

import dynamic from 'next/dynamic';

const ExportReport = dynamic(() => import('../../components/ExportReport'), { ssr: false });

export default function Page() {
  return <ExportReport />;
}
