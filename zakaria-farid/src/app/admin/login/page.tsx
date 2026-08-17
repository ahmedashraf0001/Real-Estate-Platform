'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, LogIn, Lock, Mail, ShieldCheck } from 'lucide-react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      router.push('/admin');
    }
  }

  return (
    <div style={{
      display: 'flex',
      flex: 1,
      minHeight: '100vh',
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #07090D 0%, #0A0C10 50%, #11141B 100%)',
      padding: '24px',
      boxSizing: 'border-box',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{
        background: 'rgba(22, 23, 28, 0.98)',
        borderRadius: '20px',
        padding: '40px 36px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.6), 0 0 30px rgba(221,167,82,0.12)',
        border: '1px solid rgba(221, 167, 82, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #DDA752 0%, #C48D3A 100%)',
            color: '#0A0C10',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 900,
            fontSize: '22px',
            marginBottom: '14px',
            border: '1.5px solid rgba(221,167,82,0.4)',
            boxShadow: '0 8px 20px rgba(221,167,82,0.25)',
          }}>
            ZF
          </div>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '24px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 4px' }}>
            Admin Portal
          </h1>
          <p style={{ color: '#8E9BAE', fontSize: '13px', margin: 0, fontWeight: 500 }}>
            Zakaria Farid Real Estate Management
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#8E9BAE', marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#5A6678' }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                id="admin-email"
                placeholder="admin@example.com"
                style={{
                  width: '100%',
                  padding: '11px 12px 11px 38px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                  color: '#FFFFFF',
                  background: 'rgba(255,255,255,0.05)',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#8E9BAE', marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#5A6678' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                id="admin-password"
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '11px 12px 11px 38px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                  color: '#FFFFFF',
                  background: 'rgba(255,255,255,0.05)',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              />
            </div>
          </div>

          {error && (
            <div style={{
              background: 'rgba(220,38,38,0.12)',
              border: '1px solid rgba(220,38,38,0.35)',
              borderRadius: '8px',
              padding: '10px 12px',
              color: '#FCA5A5',
              fontSize: '12px',
              fontWeight: 600,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            id="admin-login-submit"
            style={{
              marginTop: '8px',
              padding: '12px 20px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #DDA752 0%, #C48D3A 100%)',
              color: '#0A0C10',
              border: 'none',
              fontWeight: 800,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(221,167,82,0.35)',
              transition: 'transform 0.15s ease',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              letterSpacing: '0.02em',
            }}
          >
            {loading ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : <LogIn size={16} strokeWidth={2} />}
            Sign In to Dashboard
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11px', color: '#5A6678', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <ShieldCheck size={14} style={{ color: '#DDA752' }} />
          <span>Protected by Auth RLS Security</span>
        </div>
      </div>
    </div>
  );
}
