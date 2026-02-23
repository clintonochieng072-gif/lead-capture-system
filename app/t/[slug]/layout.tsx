import React from 'react';

export const dynamic = 'force-dynamic';

export default function TrackingLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 min-h-screen">
        <main className="mx-auto max-w-4xl px-4 py-6 sm:py-10 sm:px-6 lg:px-8">{children}</main>
      </body>
    </html>
  );
}
