'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import supabaseClient from '../../lib/supabaseClient';
import { getUserTrackingLinks, getUserLeads, updateTrackingLinkTarget } from '../../lib/db';
import PricingModal from '../../components/PricingModal';

type NotificationItem = {
  id: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

const INDIVIDUAL_LEAD_LIMIT = 50;
const NON_PRO_VISIBLE_LEADS = 5;
const STATUS_OPTIONS = ['New', 'Contacted', 'Negotiating', 'Closed'] as const;

type LeadStatus = (typeof STATUS_OPTIONS)[number];

const normalizePlan = (plan: string | null | undefined) => {
  const value = String(plan || '').trim().toLowerCase();
  if (value === 'professional') return 'Professional';
  return 'Individual';
};

const normalizeSource = (lead: any) => {
  const raw = String(lead?.source || lead?.metadata?.source || lead?.metadata?.referrer || '').trim();
  if (!raw) return 'Unknown';
  const value = raw.toLowerCase();

  if (value.includes('facebook')) return 'Facebook';
  if (value.includes('whatsapp') || value.includes('wa.me')) return 'WhatsApp';
  if (value.includes('instagram') || value.includes('insta')) return 'Instagram';
  if (value.includes('youtube') || value.includes('youtu')) return 'YouTube';
  if (value.includes('tiktok') || value.includes('tik tok')) return 'TikTok';
  if (value.includes('email') || value.includes('mail')) return 'Email';

  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

const getLeadStatus = (lead: any): LeadStatus => {
  const candidate = String(lead?.metadata?.status || '').trim();
  if (STATUS_OPTIONS.includes(candidate as LeadStatus)) {
    return candidate as LeadStatus;
  }
  return 'New';
};

const formatPhoneForWhatsApp = (phone: string) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return `254${digits.slice(1)}`;
  return digits;
};

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
  const [currentPlan, setCurrentPlan] = React.useState<'Individual' | 'Professional'>('Individual');
  const [links, setLinks] = React.useState<any[]>([]);
  const [leads, setLeads] = React.useState<any[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'All' | LeadStatus>('All');
  const [sortBy, setSortBy] = React.useState<'newest' | 'name'>('newest');
  const [newLeadIds, setNewLeadIds] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [paying, setPaying] = React.useState(false);
  const [savingLinkId, setSavingLinkId] = React.useState<string | null>(null);
  const [targetInputs, setTargetInputs] = React.useState<Record<string, string>>({});
  const [showTargetInput, setShowTargetInput] = React.useState(false);

  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);
  const [showPricingModal, setShowPricingModal] = React.useState(false);

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
      setCurrentPlan(normalizePlan(profile?.plan));

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
          setNewLeadIds((prev) => [String(newLead.id), ...prev].slice(0, 20));

          setTimeout(() => {
            setNewLeadIds((prev) => prev.filter((id) => id !== String(newLead.id)));
          }, 180000);

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

  const handleUpgrade = async (planName: 'Individual' | 'Professional') => {
    if (!user?.id) return;

    setPaying(true);
    try {
      const res = await fetch('/api/init-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, planName }),
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
      setShowPricingModal(false);
    }
  };

  const handleStatusChange = async (leadId: string, status: LeadStatus) => {
    if (!user?.id) return;

    const lead = leads.find((item) => item.id === leadId);
    if (!lead) return;

    const nextMetadata = {
      ...(lead.metadata || {}),
      status,
    };

    setLeads((prev) => prev.map((item) => (item.id === leadId ? { ...item, metadata: nextMetadata } : item)));

    const { error } = await supabaseClient
      .from('leads')
      .update({ metadata: nextMetadata })
      .eq('id', leadId)
      .eq('owner_user_id', user.id);

    if (error) {
      setLeads((prev) => prev.map((item) => (item.id === leadId ? lead : item)));
      alert('Failed to update lead status');
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
  const isProfessional = subscriptionActive && currentPlan === 'Professional';
  const isFreeTier = !subscriptionActive;
  const planLeadLimit = isProfessional ? Number.POSITIVE_INFINITY : INDIVIDUAL_LEAD_LIMIT;
  const leadLimitReached = isFreeTier && leads.length > NON_PRO_VISIBLE_LEADS;
  const displayedLeads = leads;
  const leadsThisMonth = leads.filter((lead) => {
    const date = new Date(lead.created_at);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  const filteredLeads = displayedLeads
    .filter((lead) => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;
      return (
        String(lead.name || '').toLowerCase().includes(query) ||
        String(lead.phone || '').toLowerCase().includes(query)
      );
    })
    .filter((lead) => (statusFilter === 'All' ? true : getLeadStatus(lead) === statusFilter))
    .sort((a, b) => {
      if (sortBy === 'name') {
        return String(a.name || '').localeCompare(String(b.name || ''));
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const basePlatforms = ['Facebook', 'WhatsApp', 'Instagram', 'YouTube', 'TikTok', 'Email'];
  const platformLeadCounts = leads.reduce((acc, lead) => {
    const source = normalizeSource(lead);
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const dynamicPlatforms = Object.keys(platformLeadCounts).filter((name) => !basePlatforms.includes(name));
  const platformOrder = [...basePlatforms, ...dynamicPlatforms];
  const maxPlatformCount = Math.max(1, ...(Object.values(platformLeadCounts) as number[]));
  const freeUnlockedLeadIds = new Set(
    [...leads]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(0, NON_PRO_VISIBLE_LEADS)
      .map((lead) => String(lead.id))
  );

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
              <span>{isProfessional ? 'Professional plan' : 'Individual plan indicator'}</span>
              <span>
                {isProfessional ? `${leads.length} leads` : `${Math.min(leads.length, INDIVIDUAL_LEAD_LIMIT)}/${INDIVIDUAL_LEAD_LIMIT} leads`}
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-[#457B9D]/10 overflow-hidden">
              <div
                className="h-full bg-[#457B9D] transition-all duration-500"
                style={{
                  width: `${isProfessional ? 100 : Math.min((Math.min(leads.length, planLeadLimit) / planLeadLimit) * 100, 100)}%`,
                }}
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
          <h2 className="text-xl font-semibold text-[#1D3557]">Buyer Contacts Table</h2>
          {!isProfessional && (
            <button
              onClick={() => setShowPricingModal(true)}
              disabled={paying}
              className="rounded-xl bg-[#457B9D] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#3d6d8b] hover:shadow-md disabled:opacity-60"
            >
              {paying ? 'Processing…' : 'Upgrade'}
            </button>
          )}
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input
            type="text"
            placeholder="Search by name or phone"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-[#457B9D]/20 bg-white px-3 py-2.5 text-sm text-[#333333] focus:border-[#457B9D] focus:outline-none focus:ring-2 focus:ring-[#457B9D]/20"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'All' | LeadStatus)}
            className="w-full rounded-xl border border-[#457B9D]/20 bg-white px-3 py-2.5 text-sm text-[#333333] focus:border-[#457B9D] focus:outline-none focus:ring-2 focus:ring-[#457B9D]/20"
          >
            <option value="All">All Statuses</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'name')}
            className="w-full rounded-xl border border-[#457B9D]/20 bg-white px-3 py-2.5 text-sm text-[#333333] focus:border-[#457B9D] focus:outline-none focus:ring-2 focus:ring-[#457B9D]/20"
          >
            <option value="newest">Sort: Newest First</option>
            <option value="name">Sort: Name A-Z</option>
          </select>
        </div>

        {filteredLeads.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-[#457B9D]/20 p-8 text-center text-sm text-[#333333]/70">
            No contacts yet. Share your smart link to start connecting with interested buyers.
          </div>
        ) : (
          <div className="relative">
            <div className="overflow-x-auto rounded-xl border border-[#457B9D]/20 shadow-sm">
              <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-[#1D3557] text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold w-16">#</th>
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Phone</th>
                  <th className="px-4 py-3 text-left font-semibold">Source</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead: any, index: number) => {
                  const isLockedForFree = isFreeTier && !freeUnlockedLeadIds.has(String(lead.id));
                  const isContactLocked = isLockedForFree;
                  const isActionLocked = isLockedForFree;

                  return (
                  <tr
                    key={lead.id}
                    className={`transition-colors ${
                      newLeadIds.includes(String(lead.id))
                        ? 'bg-[#E8F4FF]'
                        : index % 2 === 0
                        ? 'bg-white'
                        : 'bg-[#F7FAFD]'
                    } hover:bg-[#EAF3FA]`}
                  >
                    <td className="px-4 py-3.5 font-semibold text-[#1D3557]">{index + 1}</td>
                    <td className="px-4 py-3.5 font-medium text-[#1D3557]">
                      <div className="flex items-center gap-2">
                        <span>{lead.name}</span>
                        {newLeadIds.includes(String(lead.id)) && (
                          <span className="rounded-full bg-[#457B9D]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#1D3557]">
                            New
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-[#333333]">
                      {isContactLocked ? (
                        <div className="relative max-w-[260px]">
                          <div className="select-none blur-[3px]">
                            <p className="font-medium text-[#1D3557]">+2547*******</p>
                            {lead.email && <p className="text-xs text-[#333333]/70">hidden@email.com</p>}
                          </div>
                          <div className="absolute inset-0 flex items-center justify-start">
                            <span className="rounded-md bg-[#1D3557]/90 px-2 py-1 text-[10px] font-semibold text-white">
                              Upgrade to view contact details for new leads!
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <a href={`tel:${lead.phone}`} className="font-medium text-[#1D3557] underline decoration-[#457B9D]/40 underline-offset-2">
                            {lead.phone}
                          </a>
                          {lead.email && <p className="text-xs text-[#333333]/70 mt-0.5">{lead.email}</p>}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-[#333333]/90">
                      {isProfessional ? normalizeSource(lead) : 'Upgrade to view source'}
                    </td>
                    <td className="px-4 py-3.5">
                      <select
                        value={getLeadStatus(lead)}
                        onChange={(e) => handleStatusChange(String(lead.id), e.target.value as LeadStatus)}
                        className="w-[140px] rounded-lg border border-[#457B9D]/20 bg-white px-2.5 py-1.5 text-xs text-[#333333] focus:border-[#457B9D] focus:outline-none focus:ring-2 focus:ring-[#457B9D]/20"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3.5">
                      {isActionLocked ? (
                        <div className="relative max-w-[260px]">
                          <div className="flex items-center gap-2 opacity-50 blur-[1px]">
                            <span className="inline-flex items-center justify-center rounded-lg bg-[#1D3557] px-2.5 py-1.5 text-xs font-semibold text-white">
                              Call
                            </span>
                            <span className="inline-flex items-center justify-center rounded-lg bg-[#25D366] px-2.5 py-1.5 text-xs font-semibold text-white">
                              WhatsApp
                            </span>
                          </div>
                          <div className="absolute inset-0 flex items-center justify-start">
                            <span className="rounded-md bg-[#1D3557]/90 px-2 py-1 text-[10px] font-semibold text-white">
                              Subscribe to call or message leads.
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <a
                            href={`tel:${lead.phone}`}
                            className="inline-flex items-center justify-center rounded-lg bg-[#1D3557] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#17314f]"
                          >
                            Call
                          </a>
                          <a
                            href={`https://wa.me/${formatPhoneForWhatsApp(lead.phone)}?text=${encodeURIComponent(`Hi ${lead.name}, thanks for your interest.`)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center rounded-lg bg-[#25D366] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1fae53]"
                          >
                            WhatsApp
                          </a>
                        </div>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {leadLimitReached && (
        <div className="rounded-xl border border-[#457B9D]/20 bg-[#F7FAFD] px-4 py-3 text-sm text-[#1D3557]">
          You can see all lead names. Upgrade to view contact details for new leads after your first {NON_PRO_VISIBLE_LEADS}.
        </div>
      )}

      {isProfessional && (
        <section className="rounded-2xl border border-[#457B9D]/20 bg-white p-4 sm:p-5 shadow-sm animate-fade-in">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#1D3557]">Cumulative Leads by Platform</h2>
            <span className="text-xs font-medium text-[#457B9D]">Professional</span>
          </div>

          <div className="mb-3 flex items-center justify-between text-xs text-[#333333]/70">
            <span>Y-axis: Number of leads</span>
            <span>X-axis: Platforms</span>
          </div>

          <div className="space-y-3">
            {platformOrder
              .filter((platform) => platformLeadCounts[platform])
              .map((platform) => {
                const count = platformLeadCounts[platform] || 0;
                const width = Math.max(6, Math.round((count / maxPlatformCount) * 100));

                return (
                  <div key={platform}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-[#1D3557]">{platform}</span>
                      <span className="text-[#333333]/80">{count}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-[#457B9D]/10">
                      <div
                        className="h-full rounded-full bg-[#457B9D] transition-all duration-500"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}

            {Object.keys(platformLeadCounts).length === 0 && (
              <p className="rounded-xl border border-dashed border-[#457B9D]/20 px-4 py-6 text-center text-sm text-[#333333]/70">
                No source data yet. New platforms will appear automatically as leads come in.
              </p>
            )}
          </div>
        </section>
      )}

      <PricingModal
        open={showPricingModal}
        currentPlan={subscriptionActive ? currentPlan : null}
        loading={paying}
        onClose={() => setShowPricingModal(false)}
        onChoosePlan={handleUpgrade}
      />

    </div>
  );
}
