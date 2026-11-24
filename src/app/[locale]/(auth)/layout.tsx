'use client';

import { Suspense } from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <Suspense fallback={<div className="animate-pulse w-full max-w-md h-96" />}>
        <main id="main-content" className="w-full max-w-md" role="main">
          {children}
        </main>
      </Suspense>
    </div>
  );
}