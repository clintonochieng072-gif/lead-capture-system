"use client";

import React, { useEffect, useState } from 'react';
import { supabaseClient } from '../../lib/supabaseClient';

export default function SubscriptionPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref');

    if (refParam && refParam.trim() !== '') {
      sessionStorage.setItem('referrer_id', refParam.trim());
    }
  }, []);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res: any = await supabaseClient.auth.getUser();
        const user = res?.data?.user;
        if (user?.id) setUserId(user.id);
      } catch (err) {
        console.error('getUser error', err);
      }
    }
    fetchUser();
  }, []);

  async function handlePay() {
    if (!userId) {
      window.location.href = '/login';
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/init-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || 'Error initializing payment');
        setLoading(false);
        return;
      }
      if (json.authorization_url) {
        window.location.href = json.authorization_url;
      } else {
        alert('No authorization URL returned');
      }
    } catch (err) {
      console.error('init-subscription fetch error', err);
      alert('Server error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Upgrade to unlimited leads</h1>
      <div className="border rounded p-4">
        <h2 className="text-xl font-semibold">Monthly Subscription</h2>
        <p className="text-gray-600">KES 999 / month</p>
        <p className="mt-2 text-sm text-gray-500">Recurring billing with unlimited lead capture while your subscription is active.</p>
        <button
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
          onClick={handlePay}
          disabled={loading}
        >
          {loading ? 'Processing…' : 'Pay Now'}
        </button>
      </div>
    </div>
  );
}
