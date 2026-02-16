'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import supabaseClient from '../../lib/supabaseClient';
import { getUserTrackingLinks, getUserLeads, updateTrackingLinkTarget } from '../../lib/db';

type NotificationItem = {
  id: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

const FREE_LEAD_LIMIT = 10;

const formatLeadTime = (value: string) =>
  new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = React.useState<any>(null);
  const [accessToken, setAccessToken] = React.useState<string | null>(null);
  const [subscriptionActive, setSubscriptionActive] = React.useState(false);
  const [links, setLinks] = React.useState<any[]>([]);
  const [leads, setLeads] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showPaymentModal, setShowPaymentModal] = React.useState(false);
  const [paying, setPaying] = React.useState(false);
  const [savingLinkId, setSavingLinkId] = React.useState<string | null>(null);
  const [targetInputs, setTargetInputs] = React.useState<Record<string, string>>({});
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [showNotifications, setShowNotifications] = React.useState(false);

  const fetchNotifications = React.useCallback(async (token: string) => {
    try {
      const res = await fetch('/api/notifications', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) return;

      const json = await res.json();
      setNotifications(json.notifications || []);
      setUnreadCount(json.unreadCount || 0);
    } catch {
    }
  }, []);

  const refreshDashboard = React.useCallback(async () => {
    setLoading(true);
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();

    if (!session?.user) {
      router.push('/');
      return;
    }

    setUser(session.user);
    setAccessToken(session.access_token || null);

    try {
      let { data: profile } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!profile) {
        const urlParams = new URLSearchParams(window.location.search);
        const referrerFromUrl = urlParams.get('ref');
        const referrerFromStorage = typeof window !== 'undefined' ? sessionStorage.getItem('referrer_id') : null;
        const referrerId = referrerFromUrl || referrerFromStorage;
        const validReferrerId = referrerId && referrerId.trim() !== '' ? referrerId.trim() : null;

        await fetch('/api/auth/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: session.user.id,
            email: session.user.email,
            fullName: session.user.user_metadata?.full_name,
            referrerId: validReferrerId || undefined,
          }),
        });

        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('referrer_id');
        }

        if (referrerFromUrl) {
          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete('ref');
          window.history.replaceState({}, '', cleanUrl.toString());
        }

        const profileRes = await supabaseClient
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();

        profile = profileRes.data;
      }

      const expiryTs = profile?.subscription_expires_at ? new Date(profile.subscription_expires_at).getTime() : 0;
      const active = Boolean(profile?.subscription_active && expiryTs > Date.now());
      setSubscriptionActive(active);

      const linksData = await getUserTrackingLinks(session.user.id);
      setLinks(linksData);
      setTargetInputs(
        linksData.reduce((acc: Record<string, string>, link: any) => {
          acc[link.id] = link.target_url || '';
          return acc;
        }, {})
      );

      const leadsData = await getUserLeads(session.user.id);
      setLeads(leadsData);

      if (session.access_token) {
        await fetchNotifications(session.access_token);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchNotifications, router]);

  React.useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('subscription') === 'success') {
      refreshDashboard();
    }
    if (params.get('upgrade') === '1') {
      setShowPaymentModal(true);
    }
  }, [refreshDashboard]);

  React.useEffect(() => {
    if (!accessToken) return;

    const id = setInterval(() => {
      fetchNotifications(accessToken);
    }, 20000);

    return () => clearInterval(id);
  }, [accessToken, fetchNotifications]);

  const handleUpgrade = async () => {
    if (!user?.id) return;
    setPaying(true);
    try {
      const res = await fetch('/api/init-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || 'Error initializing payment');
        return;
      }
      if (json.authorization_url) {
        window.location.href = json.authorization_url;
      }
    } catch {
      alert('Server error');
    } finally {
      setPaying(false);
    }
  };

  const handleUpdateTarget = async (linkId: string) => {
    if (!user?.id) return;

    const candidateUrl = (targetInputs[linkId] || '').trim();
    if (!candidateUrl) {
      alert('Please enter a target URL.');
      return;
    }

    setSavingLinkId(linkId);
    try {
      const result = await updateTrackingLinkTarget(linkId, user.id, candidateUrl);
      if (result.error) {
        alert(`Error: ${result.error}`);
        return;
      }

      setLinks((prev) => prev.map((l) => (l.id === linkId ? { ...l, target_url: candidateUrl } : l)));
      alert('Target URL updated!');
    } catch {
      alert('Failed to update');
    } finally {
      setSavingLinkId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied!');
  };

  const markAllNotificationsAsRead = async () => {
    if (!accessToken) return;
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ markAll: true }),
      });

      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch {
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const leadsByLink: Record<string, any[]> = {};
  leads.forEach((lead) => {
    if (!leadsByLink[lead.tracking_link_id]) {
      leadsByLink[lead.tracking_link_id] = [];
    }
    leadsByLink[lead.tracking_link_id].push(lead);
  });

  const freeLimitReached = !subscriptionActive && leads.length >= FREE_LEAD_LIMIT;
  const leadsThisMonth = leads.filter((lead) => {
    const date = new Date(lead.created_at);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;
  const freeTierProgress = Math.min(Math.round((Math.min(leads.length, FREE_LEAD_LIMIT) / FREE_LEAD_LIMIT) * 100), 100);

  return (
    <div className="space-y-6 sm:space-y-8 px-4 sm:px-0">
      <section className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-blue-50 to-cyan-50 p-5 sm:p-7 shadow-sm animate-fade-in">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
              Welcome back, {user?.user_metadata?.full_name || user?.email}
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-2xl">
              Manage your smart links, monitor lead activity, and keep your pipeline healthy.
            </p>
          </div>

          <div className="relative self-start">
            <button
              onClick={() => setShowNotifications((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Notifications
              {unreadCount > 0 && (
                <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 max-w-[92vw] rounded-2xl border border-slate-200 bg-white shadow-xl z-20 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <p className="text-sm font-semibold text-slate-900">Notifications</p>
                  <button onClick={markAllNotificationsAsRead} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                    Mark all as read
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-slate-500">No notifications yet.</p>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className={`px-4 py-3 border-b border-slate-100 transition-colors ${n.is_read ? 'bg-white' : 'bg-indigo-50/60'}`}>
                        <p className="text-sm text-slate-800">{n.message}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatLeadTime(n.created_at)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 animate-fade-in">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Total Leads</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{leads.length}</p>
          <p className="mt-2 text-sm text-slate-500">Captured across all smart links</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Leads This Month</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{leadsThisMonth}</p>
          <p className="mt-2 text-sm text-slate-500">Current month lead velocity</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md md:col-span-2 xl:col-span-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Free Tier Progress</p>
            <span className="text-xs font-semibold text-slate-700">{Math.min(leads.length, FREE_LEAD_LIMIT)}/{FREE_LEAD_LIMIT}</span>
          </div>
          <div className="mt-3 h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all duration-500" style={{ width: `${freeTierProgress}%` }} />
          </div>
          <p className="mt-2 text-sm text-slate-500">{subscriptionActive ? 'Subscription active: unlimited leads enabled.' : 'Upgrade when you reach your free limit.'}</p>
        </article>
      </section>

      {freeLimitReached && (
        <section className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 sm:p-6 shadow-sm animate-fade-in">
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Lead capture locked</h2>
          <p className="mt-2 text-sm sm:text-base text-slate-700">
            You have reached your free lead capture limit. Upgrade for unlimited leads.
          </p>
          <button onClick={() => setShowPaymentModal(true)} className="mt-4 inline-flex items-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg">
            Upgrade
          </button>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm animate-fade-in">
        <div className="mb-5 flex items-center justify-between gap-2">
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">Lead Capture Access</h2>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              subscriptionActive || !freeLimitReached ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}
          >
            {subscriptionActive ? 'Paid: Unlimited' : freeLimitReached ? 'Locked' : 'Free Tier Active'}
          </span>
        </div>
        {!subscriptionActive && (
          <p className="text-sm text-slate-600">
            Free tier usage: {Math.min(leads.length, FREE_LEAD_LIMIT)} / {FREE_LEAD_LIMIT} leads.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm animate-fade-in">
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">Tracking Links</h2>
          <p className="text-sm text-slate-600">{links.length} link{links.length !== 1 ? 's' : ''}</p>
        </div>

        {links.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 py-10 text-center">
            <p className="text-sm text-slate-500">No links yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {links.map((link) => {
              const smartUrl = typeof window !== 'undefined' ? `${window.location.origin}/t/${link.slug}` : `/t/${link.slug}`;
              return (
                <div key={link.id} className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/70 p-4 sm:p-5 shadow-sm transition-all hover:shadow-md">
                  <div className="mb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate">{link.slug}</h3>
                      <p className="text-xs sm:text-sm text-slate-500 truncate">{link.label}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold self-start ${
                        link.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {link.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Target URL</p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="url"
                          className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                          value={targetInputs[link.id] || ''}
                          placeholder="https://example.com"
                          onChange={(e) =>
                            setTargetInputs((prev) => ({
                              ...prev,
                              [link.id]: e.target.value,
                            }))
                          }
                        />
                        <button
                          onClick={() => handleUpdateTarget(link.id)}
                          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-slate-800 disabled:opacity-60"
                          disabled={savingLinkId === link.id}
                        >
                          {savingLinkId === link.id ? 'Saving…' : 'Set URL'}
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Smart Link</p>
                      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                        <code className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 overflow-x-auto whitespace-nowrap">
                          {smartUrl}
                        </code>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => window.open(smartUrl, '_blank')}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:text-indigo-700"
                            title="View smart link"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <path d="M1.5 12s3.8-6 10.5-6 10.5 6 10.5 6-3.8 6-10.5 6S1.5 12 1.5 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                            </svg>
                            View
                          </button>
                          <button
                            onClick={() => copyToClipboard(smartUrl)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                            title="Copy smart link"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            </svg>
                            Copy Link
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm animate-fade-in">
        <div className="mb-5 flex items-center justify-between gap-2">
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">Captured Leads</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {leads.length} lead{leads.length !== 1 ? 's' : ''}
          </span>
        </div>

        {leads.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 py-10 text-center">
            <p className="text-sm text-slate-500">No leads yet. Share your smart link.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {links.map((link) => {
              const linkLeads = leadsByLink[link.id] || [];
              if (linkLeads.length === 0) return null;

              return (
                <div key={link.id} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3 sm:p-4 shadow-inner">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">
                    {link.slug} <span className="text-slate-500 font-medium">({linkLeads.length} lead{linkLeads.length !== 1 ? 's' : ''})</span>
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                    <table className="w-full text-sm min-w-[560px]">
                      <thead className="bg-slate-100/80 text-slate-700">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold">Name</th>
                          <th className="px-4 py-3 text-left font-semibold">Phone</th>
                          <th className="px-4 py-3 text-left font-semibold">Captured</th>
                        </tr>
                      </thead>
                      <tbody>
                        {linkLeads.map((lead: any, index: number) => (
                          <tr
                            key={lead.id}
                            className={`border-t border-slate-100 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'} hover:bg-indigo-50/70`}
                          >
                            <td className="px-4 py-3.5 font-medium text-slate-900">{lead.name}</td>
                            <td className="px-4 py-3.5 text-slate-700">{lead.phone}</td>
                            <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{formatLeadTime(lead.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[1px] p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg sm:text-xl font-semibold text-slate-900">Upgrade Subscription</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-indigo-50 via-white to-purple-50 p-4">
              <h4 className="text-base sm:text-lg font-semibold text-slate-900">Monthly Subscription</h4>
              <p className="mt-1 text-sm text-slate-600">KES 999 / month</p>
              <p className="mt-2 text-xs text-slate-500">Recurring monthly billing. Unlimited lead capture while active.</p>
              <button
                className="mt-4 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
                onClick={handleUpgrade}
                disabled={paying}
              >
                {paying ? 'Processing…' : 'Upgrade'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
