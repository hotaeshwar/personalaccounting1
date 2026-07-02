'use client';

import dynamic from 'next/dynamic';

const ArchiveList = dynamic(() => import('../../components/ArchiveList'), { ssr: false });

export default function Page() {
  return <ArchiveList />;
}
