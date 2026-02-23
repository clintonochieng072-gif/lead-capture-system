"use client";

import React, { useState } from 'react';

const detectLeadSource = () => {
  if (typeof window === 'undefined') return '';

  const params = new URLSearchParams(window.location.search);
  const explicitSource =
    params.get('source') ||
    params.get('utm_source') ||
    params.get('src') ||
    params.get('platform') ||
    '';

  const candidate = String(explicitSource || document.referrer || '').trim().toLowerCase();
  if (!candidate) return '';

  if (candidate.includes('facebook') || candidate.includes('fb.')) return 'Facebook';
  if (candidate.includes('whatsapp') || candidate.includes('wa.me')) return 'WhatsApp';
  if (candidate.includes('instagram') || candidate.includes('insta')) return 'Instagram';
  if (candidate.includes('youtube') || candidate.includes('youtu')) return 'YouTube';
  if (candidate.includes('tiktok') || candidate.includes('tik tok')) return 'TikTok';
  if (candidate.includes('email') || candidate.includes('mail')) return 'Email';

  if (explicitSource) {
    const clean = explicitSource.replace(/[-_]/g, ' ').trim();
    return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : '';
  }

  return '';
};

export default function PublicTrackerClient({
  slug,
  targetUrl
}: {
  slug: string;
  targetUrl: string;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lockedMessage, setLockedMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLockedMessage('');

    const trimmedName = (name || '').trim();
    const trimmedPhone = (phone || '').trim();

    if (!trimmedName || trimmedName.length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!trimmedPhone || trimmedPhone.length < 7) {
      setError('Please enter a valid phone number.');
      return;
    }

    const payload = { name: trimmedName, phone: trimmedPhone, source: detectLeadSource() };

    setSubmitting(true);
    try {
      const res = await fetch(`/api/track/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 403 && (json?.code === 'free_limit_reached' || json?.code === 'plan_limit_reached')) {
          setLockedMessage(
            json?.message || 'This page is temporarily unavailable.'
          );
          return;
        }
        setError(json?.error || 'Unable to submit right now. Please try again.');
        return;
      }

      const redirectUrl = json?.target_url || targetUrl;
      setSubmitted(true);
      window.location.href = redirectUrl;
    } catch {
      setError('Unable to submit right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-2 sm:px-0">
      <div className="bg-white rounded-2xl shadow-xl p-5 sm:p-8 space-y-5 sm:space-y-6">
        <div className="text-center space-y-3">
          <p className="text-[11px] sm:text-xs leading-relaxed font-semibold tracking-wide uppercase text-indigo-700">
            Step 1 of 1 — Quick &amp; Secure Info Sharing
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold leading-snug text-gray-900 text-balance">
            You&apos;re one step away from viewing our collection
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Quickly interact with the seller by leaving your details — it&apos;s safe and secure.
          </p>
        </div>

        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
          <div className="space-y-3 text-indigo-900 text-center sm:text-left">
            <div className="overflow-hidden rounded-xl border border-indigo-100 bg-white">
              <img
                src="/images/kenya-lead.jpg"
                alt="Satisfied African customer after connecting with a seller and finding the right offer"
                className="h-44 w-full object-cover"
                loading="lazy"
              />
            </div>
            <span className="block text-sm font-medium">A quick call connects you to offers that fit your goals.</span>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-xs sm:text-sm text-gray-700 space-y-2">
          <p>We will only share your info with the seller — no spam.</p>
          <p>Your contact is safe — expect a helpful call to explore the products.</p>
        </div>

        {lockedMessage ? (
          <div className="py-4 text-center space-y-3">
            <p className="text-base sm:text-lg font-semibold text-gray-900">This page is temporarily unavailable</p>
            <p className="text-sm sm:text-base text-gray-600">Please try again later or contact the seller directly.</p>
            <a href="/dashboard?upgrade=1" className="inline-block btn-primary text-sm sm:text-base">
              Upgrade
            </a>
          </div>
        ) : submitted ? (
          <div className="py-8 text-center space-y-3">
            <p className="text-base sm:text-lg font-semibold text-green-600">Redirecting…</p>
            <p className="text-sm sm:text-base text-gray-600">If you are not redirected, <a href={targetUrl} className="text-blue-600 underline">click here</a>.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs sm:text-sm">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Name</label>
              <input
                type="text"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
                minLength={2}
                maxLength={100}
                className="w-full px-4 py-3.5 text-base rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                required
                minLength={7}
                maxLength={20}
                className="w-full px-4 py-3.5 text-base rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[48px] py-3 px-4 text-base bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-shadow disabled:opacity-70"
            >
              {submitting ? 'Please wait…' : 'Check What\'s on Offer'}
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-gray-200 text-center text-xs text-gray-500 space-y-2">
          <p>Your contact details are safe and private.</p>
          <p>The seller would love to reach out and help you explore available products.</p>
        </div>
      </div>
    </div>
  );
}
