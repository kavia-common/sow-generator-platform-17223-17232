import { useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export default function AuthCallback() {
  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // supabase-js v2: exchange code from URL and set session
        const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (error) {
          // eslint-disable-next-line no-console
          console.error('Auth callback error:', error);
          window.location.replace('/auth/error');
          return;
        }
        if (data?.session) {
          window.location.replace('/'); // redirect to home/dashboard
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Auth callback error:', e);
        window.location.replace('/auth/error');
      }
    };
    handleAuthCallback();
  }, []);

  return <div style={{ padding: 20, color: 'var(--text-primary)' }}>Processing authentication...</div>;
}
