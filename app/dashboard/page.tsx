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

const FREE_LEAD_LIMIT = 5;

const formatTime = (value: string) =>
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

  const [paying, setPaying] = React.useState(false);
  const [savingLinkId, setSavingLinkId] = React.useState<string | null>(null);
  const [targetInputs, setTargetInputs] = React.useState<Record<string, string>>({});
  const [showTargetInput, setShowTargetInput] = React.useState(false);

  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);

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
  }, [refreshDashboard]);

  React.useEffect(() => {
    if (!user?.id || !accessToken) return;

    const interval = setInterval(async () => {
      await fetchNotifications(accessToken);
    }, 20000);

    return () => clearInterval(interval);
  }, [accessToken, fetchNotifications, user?.id]);

  React.useEffect(() => {
    if (!user?.id) return;

    const channel = supabaseClient
      .channel(`dashboard-leads-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
          filter: `owner_user_id=eq.${user.id}`,
        },
        (payload) => {
          const newLead = payload.new as any;

          setLeads((prev) => {
            if (prev.some((lead) => lead.id === newLead.id)) {
              return prev;
            }
            return [newLead, ...prev];
          });

          const leadName = String(newLead?.name || '').trim();
          const safeName = leadName || 'A visitor';
          const notificationMessage = `${safeName} is interested in your products`;

          setNotifications((prev) => [
            {
              id: `live-${newLead.id}`,
              message: notificationMessage,
              is_read: false,
              created_at: newLead.created_at || new Date().toISOString(),
            },
            ...prev,
          ].slice(0, 50));

          setUnreadCount((current) => current + 1);
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [user?.id]);

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

  const handleSignOut = async () => {
    await supabaseClient.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-10 w-10 rounded-full border-4 border-[#457B9D]/20 border-t-[#457B9D] animate-spin" />
      </div>
    );
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';
  const freeLimitReached = !subscriptionActive && leads.length >= FREE_LEAD_LIMIT;
  const displayedLeads = subscriptionActive ? leads : leads.slice(0, FREE_LEAD_LIMIT);
  const showUpgradeOverlay = freeLimitReached && displayedLeads.length > 0;
  const leadsThisMonth = leads.filter((lead) => {
    const date = new Date(lead.created_at);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  const primaryLink = links[0] || null;
  const smartLinkUrl = primaryLink
    ? typeof window !== 'undefined'
      ? `${window.location.origin}/t/${primaryLink.slug}`
      : `/t/${primaryLink.slug}`
    : '';

  const namedNotificationFeed = [...leads]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8)
    .map((lead) => ({
      id: lead.id,
      text: `${lead.name} is interested in your products`,
      createdAt: lead.created_at,
    }));

  const profileInitials = String(displayName)
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-5 sm:space-y-6 px-4 sm:px-0 text-[#333333]">
      <header className="rounded-2xl bg-white border border-[#457B9D]/15 shadow-sm p-4 sm:p-6 animate-fade-in">
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          <div>
            <p className="text-sm text-[#457B9D] font-medium">Dashboard</p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-[#1D3557]">
              Welcome back, {displayName}
            </h1>
          </div>

          <div className="relative flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => {
                setShowNotifications((prev) => !prev);
                setShowProfileMenu(false);
              }}
              className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#457B9D]/20 bg-white text-[#1D3557] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md md:h-12 md:w-12"
              aria-label="Notifications"
            >
              <svg className="h-5 w-5 md:h-[22px] md:w-[22px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setShowProfileMenu((prev) => !prev);
                setShowNotifications(false);
              }}
              className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1D3557] text-white text-xs font-bold shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              aria-label="Profile"
            >
              {profileInitials}
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 top-14 z-30 w-44 rounded-xl border border-[#457B9D]/20 bg-white shadow-lg p-1 animate-fade-in">
                <button
                  onClick={handleSignOut}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-[#1D3557] transition-colors hover:bg-[#457B9D]/10"
                >
                  Sign out
                </button>
              </div>
            )}

            {showNotifications && (
              <div className="absolute right-0 top-14 z-30 w-[calc(100vw-2rem)] max-w-sm md:w-96 rounded-2xl border border-[#457B9D]/20 bg-white shadow-xl overflow-hidden animate-fade-in">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#457B9D]/10 bg-[#F7FAFD]">
                  <p className="text-sm font-semibold text-[#1D3557]">Notifications</p>
                  <button onClick={markAllNotificationsAsRead} className="text-xs font-semibold text-[#457B9D] hover:text-[#1D3557]">
                    Mark all as read
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto">
                  {namedNotificationFeed.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-[#333333]/70">No new notifications yet.</p>
                  ) : (
                    namedNotificationFeed.map((item) => (
                      <div key={item.id} className="px-4 py-3 border-b border-[#457B9D]/10 hover:bg-[#457B9D]/5 transition-colors">
                        <p className="text-sm text-[#1D3557]">{item.text}</p>
                        <p className="mt-1 text-xs text-[#333333]/60">{formatTime(item.createdAt)}</p>
                      </div>
                    ))
                  )}
                </div>

                {notifications.length > 0 && namedNotificationFeed.length === 0 && (
                  <div className="px-4 py-3 text-xs text-[#333333]/60 border-t border-[#457B9D]/10">
                    {notifications[0].message}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 animate-fade-in">
        <article className="rounded-2xl border border-[#457B9D]/20 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#457B9D]">Total Leads</p>
          <p className="mt-2 text-4xl font-semibold text-[#1D3557]">{leads.length}</p>
        </article>

        <article className="rounded-2xl border border-[#457B9D]/20 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#457B9D]">Leads This Month</p>
          <p className="mt-2 text-4xl font-semibold text-[#1D3557]">{leadsThisMonth}</p>
        </article>

        <article className="rounded-2xl border border-[#457B9D]/20 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#457B9D]">Set Target URL</p>

          {primaryLink ? (
            <>
              {!showTargetInput ? (
                <button
                  onClick={() => setShowTargetInput(true)}
                  className="mt-3 w-full rounded-xl bg-[#1D3557] px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-[#17314f] hover:shadow-md"
                >
                  Set Target URL
                </button>
              ) : (
                <div className="mt-3 space-y-2">
                  <input
                    type="url"
                    value={targetInputs[primaryLink.id] || ''}
                    placeholder="https://example.com"
                    onChange={(e) =>
                      setTargetInputs((prev) => ({
                        ...prev,
                        [primaryLink.id]: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-[#457B9D]/20 bg-white px-3 py-3 text-sm text-[#333333] focus:border-[#457B9D] focus:outline-none focus:ring-2 focus:ring-[#457B9D]/20"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={() => handleUpdateTarget(primaryLink.id)}
                      disabled={savingLinkId === primaryLink.id}
                      className="rounded-xl bg-[#1D3557] px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-[#17314f] hover:shadow-md disabled:opacity-60"
                    >
                      {savingLinkId === primaryLink.id ? 'Saving…' : 'Save URL'}
                    </button>
                    <button
                      onClick={() => setShowTargetInput(false)}
                      className="rounded-xl bg-[#457B9D]/15 px-4 py-3 text-sm font-semibold text-[#1D3557] transition-all hover:bg-[#457B9D]/25"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="mt-3 text-sm text-[#333333]/70">No smart link found yet.</p>
          )}

          <div className="mt-4 rounded-xl border border-[#457B9D]/15 bg-white px-3 py-2.5">
            <div className="flex items-center justify-between text-xs font-medium text-[#333333]/70">
              <span>Free tier indicator</span>
              <span>{Math.min(leads.length, FREE_LEAD_LIMIT)}/{FREE_LEAD_LIMIT} leads</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-[#457B9D]/10 overflow-hidden">
              <div
                className="h-full bg-[#457B9D] transition-all duration-500"
                style={{ width: `${Math.min((Math.min(leads.length, FREE_LEAD_LIMIT) / FREE_LEAD_LIMIT) * 100, 100)}%` }}
              />
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-[#457B9D]/20 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#457B9D]">Copy Smart Link</p>

          {primaryLink ? (
            <>
              <div className="mt-3 rounded-xl border border-[#457B9D]/15 bg-[#F9FCFF] p-3">
                <p className="text-xs text-[#333333]/70">Smart Link</p>
                <p className="mt-1 text-sm font-medium text-[#1D3557] break-all">{smartLinkUrl}</p>
              </div>

              <button
                onClick={() => copyToClipboard(smartLinkUrl)}
                className="mt-3 w-full rounded-xl bg-[#457B9D] px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-[#3d6d8b] hover:shadow-md"
              >
                Copy Smart Link
              </button>
            </>
          ) : (
            <p className="mt-3 text-sm text-[#333333]/70">No smart link found yet.</p>
          )}
        </article>
      </section>

      <section className="rounded-2xl border border-[#457B9D]/20 bg-white p-4 sm:p-5 shadow-sm animate-fade-in">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#1D3557]">Lead Capture Table</h2>
          {!subscriptionActive && (
            <button
              onClick={handleUpgrade}
              disabled={paying}
              className="rounded-xl bg-[#457B9D] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#3d6d8b] hover:shadow-md disabled:opacity-60"
            >
              {paying ? 'Processing…' : 'Upgrade'}
            </button>
          )}
        </div>

        {displayedLeads.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-[#457B9D]/20 p-8 text-center text-sm text-[#333333]/70">
            No leads yet. Share your smart link to start capturing interest.
          </div>
        ) : (
          <div className="relative">
            <div className={`overflow-x-auto rounded-xl border border-[#457B9D]/20 shadow-sm ${showUpgradeOverlay ? 'pointer-events-none blur-[1.5px]' : ''}`}>
              <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-[#1D3557] text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold w-16">#</th>
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Phone</th>
                  <th className="px-4 py-3 text-left font-semibold">Captured</th>
                </tr>
              </thead>
              <tbody>
                {displayedLeads.map((lead: any, index: number) => (
                  <tr
                    key={lead.id}
                    className={`transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-[#F7FAFD]'} hover:bg-[#EAF3FA]`}
                  >
                    <td className="px-4 py-3.5 font-semibold text-[#1D3557]">{index + 1}</td>
                    <td className="px-4 py-3.5 font-medium text-[#1D3557]">{lead.name}</td>
                    <td className="px-4 py-3.5 text-[#333333]">{lead.phone}</td>
                    <td className="px-4 py-3.5 text-[#333333]/80 whitespace-nowrap">{formatTime(lead.created_at)}</td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>

            {showUpgradeOverlay && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-[#1D3557]/45 p-4">
                <div className="w-full max-w-lg rounded-2xl border border-[#457B9D]/30 bg-white p-6 text-center shadow-2xl">
                  <p className="text-base sm:text-lg font-semibold text-[#1D3557]">
                    You’ve reached your free plan limit. Upgrade to view all leads and capture more.
                  </p>
                  <p className="mt-2 text-sm text-[#333333]/80">
                    You can currently view your first {FREE_LEAD_LIMIT} leads. Upgrade to unlock full lead history.
                  </p>
                  <button
                    onClick={handleUpgrade}
                    disabled={paying}
                    className="mt-5 inline-flex items-center justify-center rounded-xl bg-[#457B9D] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#3d6d8b] hover:shadow-md disabled:opacity-60"
                  >
                    {paying ? 'Processing…' : 'Upgrade'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

    </div>
  );
}
