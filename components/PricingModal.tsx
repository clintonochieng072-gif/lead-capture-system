'use client';

import React from 'react';

type PlanName = 'Individual' | 'Professional';

type PricingModalProps = {
  open: boolean;
  loading?: boolean;
  currentPlan?: string | null;
  onClose: () => void;
  onChoosePlan: (plan: PlanName) => void;
};

const plans: {
  name: PlanName;
  priceUsd: string;
  priceKes: string;
  badge?: string;
  features: string[];
}[] = [
  {
    name: 'Individual',
    priceUsd: '$29/month',
    priceKes: '~3,700 KES',
    features: [
      'Capture up to 50 leads per month.',
      'Generate smart links instantly so prospects can reach you faster.',
      'Use a clean dashboard with essential analytics to stay focused.',
      'Upgrade to view sources and unlock deeper lead insights.',
    ],
  },
  {
    name: 'Professional',
    priceUsd: '$59/month',
    priceKes: '~7,600 KES',
    badge: 'Recommended',
    features: [
      'Capture unlimited leads as your campaigns grow.',
      'See where your clients come from (Facebook, WhatsApp, Instagram, YouTube, Email).',
      'Get instant dashboard notifications so you never miss a lead.',
      'Highlight top-performing platforms so you can focus your marketing energy.',
    ],
  },
];

export default function PricingModal({
  open,
  loading = false,
  currentPlan,
  onClose,
  onChoosePlan,
}: PricingModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1D3557]/60 p-4">
      <div className="w-full max-w-5xl rounded-2xl border border-[#457B9D]/30 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#457B9D]/15 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-xl font-semibold text-[#1D3557]">Choose your plan</h2>
            <p className="mt-1 text-sm text-[#333333]/80">Pick the plan that matches your lead growth goals.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-[#457B9D]/10 px-3 py-1.5 text-sm font-semibold text-[#1D3557] hover:bg-[#457B9D]/20"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:gap-5 sm:p-6">
          {plans.map((plan) => {
            const isPro = plan.name === 'Professional';
            const isCurrent = Boolean(currentPlan) && (currentPlan || '').toLowerCase() === plan.name.toLowerCase();
            const cta = isCurrent ? 'Current Plan' : isPro ? 'Upgrade' : 'Subscribe';

            return (
              <article
                key={plan.name}
                className={`rounded-2xl border p-5 shadow-sm transition-all ${
                  isPro
                    ? 'border-[#1D3557] bg-gradient-to-b from-[#F3F8FD] to-white ring-2 ring-[#457B9D]/30'
                    : 'border-[#457B9D]/25 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-[#1D3557]">{plan.name}</h3>
                    <p className="mt-2 text-2xl font-bold text-[#1D3557]">{plan.priceUsd}</p>
                    <p className="text-sm font-medium text-[#457B9D]">{plan.priceKes}</p>
                  </div>
                  {plan.badge && (
                    <span className="rounded-full bg-[#1D3557] px-3 py-1 text-xs font-semibold text-white">
                      {plan.badge}
                    </span>
                  )}
                </div>

                <ul className="mt-4 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-[#333333]/90">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#457B9D]" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => onChoosePlan(plan.name)}
                  disabled={loading || isCurrent}
                  className={`mt-5 w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                    isPro
                      ? 'bg-[#1D3557] text-white hover:bg-[#17314f] hover:shadow-md'
                      : 'bg-[#457B9D] text-white hover:bg-[#3d6d8b] hover:shadow-md'
                  }`}
                >
                  {loading ? 'Processing…' : cta}
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
