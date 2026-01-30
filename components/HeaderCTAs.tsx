"use client";

import React from 'react';
import Link from 'next/link';
import supabaseClient from '../lib/supabaseClient';

export default function HeaderCTAs() {
  const [loading, setLoading] = React.useState(false);

  const handleGoogleSignup = async () => {
    try {
      setLoading(true);
      const redirectTo = `${window.location.origin}/dashboard`;
      await supabaseClient.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    } catch (err) {
      console.error('OAuth error', err);
      setLoading(false);
      alert('Failed to start Google sign-up.');
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Link 
        href="/login" 
        className="text-sm font-medium text-gray-600 hover:text-gray-900 transition"
      >
        Login
      </Link>

      <button
        onClick={handleGoogleSignup}
        disabled={loading}
        className="text-sm font-medium px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-md transition disabled:opacity-50"
      >
        {loading ? 'Signing in…' : 'Continue with Google'}
      </button>
    </div>
  );
}
