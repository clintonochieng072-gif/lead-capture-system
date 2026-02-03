"use client";
import React from 'react';
import supabaseClient from '../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    // Capture referral ID from URL query parameter on page load
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref && ref.trim() !== '') {
      // Store referral ID in sessionStorage to persist through OAuth flow
      sessionStorage.setItem('referrer_id', ref.trim());
      console.log('✅ Affiliate referrer ID captured:', ref);
    } else {
      // No ref parameter = not an affiliate link
      console.log('ℹ️ No affiliate referrer - user came directly');
    }
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const redirectTo = `${window.location.origin}/dashboard`;
      await supabaseClient.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
      // Supabase will redirect the browser; no further action here.
    } catch (err) {
      console.error('OAuth error', err);
      setLoading(false);
      alert('Failed to start Google sign-in.');
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 py-20">
      <section className="card text-center">
        <h1 className="text-3xl font-bold">Sign in to your Lead Capture Dashboard</h1>
        <p className="mt-2 text-gray-600">Use Google to quickly create an account and start capturing leads.</p>
        <div className="mt-6">
          <button onClick={handleGoogleSignIn} className="btn-primary px-6 py-3" disabled={loading}>
            {loading ? 'Redirecting…' : 'Continue with Google'}
          </button>
        </div>
      </section>

      <section className="card">
        <h3 className="text-xl font-semibold">Why sign in?</h3>
        <ul className="mt-3 list-inside list-disc text-gray-700">
          <li>Create tracking links for your campaigns</li>
          <li>Capture leads and view them in one dashboard</li>
          <li>Share links and grow your business</li>
        </ul>
      </section>
    </div>
  );
}
