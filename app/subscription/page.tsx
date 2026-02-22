"use client";

import React, { useEffect, useState } from 'react';
import { supabaseClient } from '../../lib/supabaseClient';
import PricingModal from '../../components/PricingModal';

type PlanName = 'Individual' | 'Professional';

export default function SubscriptionPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [showPlans, setShowPlans] = useState(false);
  const [paying, setPaying] = useState(false);

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
        if (user?.id) {
          setUserId(user.id);

          const { data: profile } = await supabaseClient
            .from('profiles')
            .select('plan, subscription_active, subscription_expires_at')
            .eq('user_id', user.id)
            .maybeSingle();

          const expiryTs = profile?.subscription_expires_at ? new Date(profile.subscription_expires_at).getTime() : 0;
          const active = Boolean(profile?.subscription_active && expiryTs > Date.now());

          if (!active) {
            setCurrentPlan(null);
          } else if (String(profile?.plan || '').toLowerCase() === 'professional') {
            setCurrentPlan('Professional');
          } else {
            setCurrentPlan('Individual');
          }
        }
      } catch (err) {
        console.error('getUser error', err);
      }
    }
    fetchUser();
  }, []);

  async function handlePay(planName: PlanName) {
    if (!userId) {
      window.location.href = '/login';
      return;
    }

    setPaying(true);
    try {
      const res = await fetch('/api/init-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, planName }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || 'Error initializing payment');
        setPaying(false);
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
      setPaying(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-bold text-[#1D3557]">Choose your growth plan</h1>
      <p className="mt-2 text-[#333333]/80">
        Convert more visitors with a plan built for your current stage and upgrade anytime.
      </p>

      <div className="mt-5 rounded-2xl border border-[#457B9D]/20 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-[#457B9D]">Pricing</p>
        <p className="mt-1 text-base text-[#1D3557]">Individual: $29/month (~3,700 KES) • Professional: $59/month (~7,600 KES)</p>
        <button
          className="mt-4 rounded-xl bg-[#1D3557] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#17314f]"
          onClick={() => setShowPlans(true)}
        >
          View Plans
        </button>
      </div>

      <PricingModal
        open={showPlans}
        loading={paying}
        currentPlan={currentPlan}
        onClose={() => setShowPlans(false)}
        onChoosePlan={handlePay}
      />
    </div>
  );
}
