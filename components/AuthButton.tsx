'use client';
import React from 'react';
import supabaseClient from '../lib/supabaseClient';

export default function AuthButton() {
  const [user, setUser] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const get = async () => {
      const {
        data: { session }
      } = await supabaseClient.auth.getSession();
      setUser(session?.user ?? null);
    };
    get();
    const { data: listener } = supabaseClient.auth.onAuthStateChange((_event, sess) => {
      setUser(sess?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    setLoading(true);
    await supabaseClient.auth.signInWithOAuth({ provider: 'google' });
  };

  const signOut = async () => {
    setLoading(true);
    await supabaseClient.auth.signOut();
    setUser(null);
    setLoading(false);
  };

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">
            {user.email ?? user.user_metadata?.full_name}
          </p>
          <p className="text-xs text-gray-500">Account</p>
        </div>
        <button
          onClick={signOut}
          disabled={loading}
          className="btn-secondary"
        >
          {loading ? 'Signing out...' : 'Sign out'}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={signIn}
      disabled={loading}
      className="btn-primary"
    >
      {loading ? 'Signing in...' : 'Continue with Google'}
    </button>
  );
}
