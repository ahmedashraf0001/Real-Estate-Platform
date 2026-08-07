import Link from 'next/link';

export default function NotFound() {
  return (
    <html>
      <body style={{ fontFamily: 'var(--font-sans, system-ui)', background: 'var(--color-bg, #F7F7F7)', color: 'var(--color-text, #1A1A1A)', margin: 0 }}>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '32px', gap: '24px' }}>
          <p style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '120px', fontWeight: 700, color: 'var(--color-accent, #C9A96A)', lineHeight: 1, margin: 0 }}>404</p>
          <h1 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '36px', fontWeight: 600, margin: 0 }}>Page Not Found</h1>
          <p style={{ fontSize: '16px', color: '#6B6B6B', maxWidth: '400px', lineHeight: '26px', margin: 0 }}>
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Link
            href="/en"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 28px', borderRadius: '999px', background: '#1E4D3D', color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: '15px' }}
          >
            ← Back to Home
          </Link>
        </div>
      </body>
    </html>
  );
}
