import Link from 'next/link';

export default function NotFound() {
  return (
    <html lang="en">
      <head>
        <title>404 — Sovereign Architectural Archive | Zakaria Farid</title>
      </head>
      <body style={{ 
        fontFamily: "'Plus Jakarta Sans', sans-serif", 
        background: '#0A0C10', 
        color: '#FFFFFF', 
        margin: 0,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ 
          maxWidth: '540px',
          width: '90%',
          textAlign: 'center', 
          padding: '3rem 2rem', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: '1.5rem',
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '28px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(221, 167, 82, 0.15)',
            border: '1px solid rgba(221, 167, 82, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: 800,
            color: '#DDA752',
            boxShadow: '0 0 20px rgba(221, 167, 82, 0.3)'
          }}>
            ZF
          </div>

          <p style={{ 
            fontFamily: "'Plus Jakarta Sans', sans-serif", 
            fontSize: '84px', 
            fontWeight: 900, 
            color: '#DDA752', 
            lineHeight: 1, 
            margin: 0,
            letterSpacing: '-0.04em',
            textShadow: '0 0 30px rgba(221, 167, 82, 0.4)'
          }}>
            404
          </p>

          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            Architectural Vista Not Found
          </h1>

          <p style={{ fontSize: '0.9375rem', color: '#8E9BAE', lineHeight: '1.6', margin: 0 }}>
            The estate or directory page you are searching for has been relocated or is restricted within the sovereign archive.
          </p>

          <Link
            href="/en"
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '14px 28px', 
              borderRadius: '9999px', 
              background: 'linear-gradient(135deg, #F5E5BE 0%, #D4AF37 45%, #C59A45 100%)', 
              color: '#0A0C10', 
              textDecoration: 'none', 
              fontWeight: 700, 
              fontSize: '0.9375rem',
              boxShadow: '0 4px 18px rgba(197, 154, 69, 0.25)',
              marginTop: '0.5rem'
            }}
          >
            Return to Sovereign Gallery
          </Link>
        </div>
      </body>
    </html>
  );
}
