import '../styles/globals.css';
import AuthButton from '../components/AuthButton';

export const metadata = {
  title: 'Direct Buyer Access'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <nav className="border-b border-gray-200 bg-white shadow-sm">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Direct Buyer Access</h1>
              <AuthButton />
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
