import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="card max-w-md w-full text-center">
        <h1 className="mb-2 text-4xl font-bold text-gray-900">404</h1>
        <h2 className="mb-4 text-xl text-gray-600">
          Page not found
        </h2>
        <p className="mb-8 text-gray-500">
          This page is unavailable or has been removed. Please check the URL and try again.
        </p>
        <Link href="/" className="btn-primary inline-block">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
