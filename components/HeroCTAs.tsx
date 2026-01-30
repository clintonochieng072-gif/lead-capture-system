"use client";

import React from 'react';
import Link from 'next/link';
import supabaseClient from '../lib/supabaseClient';

export default function HeroCTAs() {
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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Link 
        href="/login" 
        className="inline-block px-6 py-3 rounded-lg text-sm font-semibold bg-blue-500 text-white shadow-lg hover:bg-blue-600 hover:shadow-xl transition"
      >
        Login
      </Link>

      <button
        onClick={handleGoogleSignup}
        disabled={loading}
        className="inline-block px-6 py-3 rounded-lg text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition disabled:opacity-50"
      >
        {loading ? 'Redirecting…' : 'Get Started for Free'}
      </button>
    </div>
  );
}
