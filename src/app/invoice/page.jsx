'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';

const InvoiceDetails = dynamic(() => import('../../components/InvoiceDetails'), { ssr: false });

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    }>
      <InvoiceDetails />
    </Suspense>
  );
}
