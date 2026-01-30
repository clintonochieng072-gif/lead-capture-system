"use client";

import React, { useState } from 'react';

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

  const postLeadInBackground = (payload: Record<string, any>) => {
    try {
      const url = `/api/track/${slug}`;
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      const ok = navigator.sendBeacon(url, blob);
      if (!ok) {
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => {});
      }
    } catch (err) {
      fetch(`/api/track/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {});
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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

    const payload = { name: trimmedName, phone: trimmedPhone };

    postLeadInBackground(payload);
    setSubmitted(true);

    try {
      window.location.href = targetUrl;
    } catch (err) {
      window.open(targetUrl, '_blank');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 sm:px-0">
      <div className="mb-6 p-4 bg-white/60 backdrop-blur rounded-lg border border-gray-200/50 shadow-sm">
        <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
          <span className="font-semibold text-gray-900">We respect your privacy.</span> Your information is secure and will only be used to contact you regarding this request.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Connect With Us</h1>
          <p className="text-sm sm:text-base text-gray-600">Tell us a bit about yourself and we&apos;ll be in touch.</p>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-3">
            <div className="text-5xl">✅</div>
            <p className="text-base sm:text-lg font-semibold text-green-600">Redirecting…</p>
            <p className="text-sm sm:text-base text-gray-600">If you are not redirected, <a href={targetUrl} className="text-blue-600 underline">click here</a>.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs sm:text-sm">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Full Name</label>
              <input
                type="text"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
                minLength={2}
                maxLength={100}
                className="w-full px-4 py-3 text-sm sm:text-base rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none"
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
                className="w-full px-4 py-3 text-sm sm:text-base rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 text-sm sm:text-base bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-shadow"
            >
              View My Website
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-gray-200 text-center text-xs text-gray-500 space-y-2">
          <p>🔒 Your data is encrypted and secure</p>
          <p>⚡ Instant connection to the website owner</p>
        </div>
      </div>
    </div>
  );
}
