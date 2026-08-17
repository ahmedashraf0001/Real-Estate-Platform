import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Back Soon | Zakaria Farid Real Estate',
  description: 'We are curating improvements. Please check back shortly.',
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ lang?: string }>;
}

export default async function MaintenancePage({ searchParams }: PageProps) {
  const { lang } = await searchParams;
  const isAr = lang === 'ar';

  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '201000000000';
  const whatsappUrl = `https://wa.me/${whatsapp}`;

  const copy = {
    badge: isAr ? 'ترقية معمارية مجدولة' : 'Scheduled Architectural Upgrade',
    headline: isAr
      ? 'نُطوّر تجربة الاستعراض الفاخرة'
      : 'Curating Exceptional Digital Improvements',
    sub: isAr
      ? 'الموقع سيعود قريباً بحلته الفاخرة الجديدة. إذا كنت بحاجة إلى استشارة فورية، تواصل معنا مباشرة عبر الواتساب.'
      : 'The sovereign gallery will return shortly. For immediate acquisition inquiries, reach our client desk directly.',
    cta: isAr ? 'تواصل عبر واتساب' : 'Contact via WhatsApp',
    switchLang: isAr ? 'English' : 'عربي',
    switchUrl: isAr ? '?lang=en' : '?lang=ar',
    brand: 'Zakaria Farid',
    tagline: isAr ? 'عقارات معمارية فاخرة · مصر' : 'Sovereign Architectural Estates · Egypt',
  };

  return (
    <html lang={isAr ? 'ar' : 'en'} dir={isAr ? 'rtl' : 'ltr'}>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Cairo:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

          body {
            min-height: 100dvh;
            background: #0A0C10;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-family: ${isAr ? "'Cairo', sans-serif" : "'Plus Jakarta Sans', sans-serif"};
            color: #fff;
            padding: 24px;
            position: relative;
            overflow: hidden;
          }

          body::before {
            content: '';
            position: absolute;
            inset: 0;
            background:
              radial-gradient(ellipse 60% 50% at 50% 10%, rgba(221, 167, 82, 0.12) 0%, transparent 70%),
              radial-gradient(ellipse 80% 60% at 50% 90%, rgba(18, 24, 38, 0.6) 0%, transparent 70%);
            pointer-events: none;
          }

          .card {
            position: relative;
            z-index: 1;
            max-width: 580px;
            width: 100%;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 24px;
            padding: 3rem 2.5rem;
            border-radius: 32px;
            background: rgba(255, 255, 255, 0.04);
            backdrop-filter: blur(28px);
            border: 1px solid rgba(255, 255, 255, 0.14);
            box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
          }

          .wordmark {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
          }

          .logo-ring {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            border: 1.5px solid rgba(221, 167, 82, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 6px;
            background: rgba(221, 167, 82, 0.1);
            box-shadow: 0 0 20px rgba(221, 167, 82, 0.25);
          }

          .logo-monogram {
            font-size: 22px;
            font-weight: 800;
            color: #DDA752;
            letter-spacing: 0.04em;
          }

          .brand-name {
            font-size: 16px;
            font-weight: 700;
            color: #FFFFFF;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }

          .brand-tagline {
            font-size: 11px;
            font-weight: 700;
            color: #DDA752;
            letter-spacing: 0.12em;
            text-transform: uppercase;
          }

          .divider {
            width: 48px;
            height: 1px;
            background: rgba(221, 167, 82, 0.35);
          }

          .badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: rgba(221, 167, 82, 0.12);
            border: 1px solid rgba(221, 167, 82, 0.35);
            color: #DDA752;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            padding: 6px 16px;
            border-radius: 20px;
          }

          .badge-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #DDA752;
            box-shadow: 0 0 8px #DDA752;
          }

          h1 {
            font-size: clamp(26px, 4.5vw, 36px);
            font-weight: 800;
            line-height: 1.25;
            color: #fff;
            letter-spacing: -0.02em;
          }

          h1 span {
            color: #DDA752;
          }

          .sub {
            font-size: 15px;
            line-height: 1.7;
            color: #C7D2DF;
            max-width: 460px;
          }

          .progress-bar {
            width: 200px;
            height: 3px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 2px;
            overflow: hidden;
          }

          .progress-bar::after {
            content: '';
            display: block;
            height: 100%;
            background: linear-gradient(90deg, transparent, #DDA752, transparent);
            animation: sweep 2.4s ease-in-out infinite;
          }

          @keyframes sweep {
            0% { transform: translateX(-200%); }
            100% { transform: translateX(200%); }
          }

          .cta {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            background: linear-gradient(135deg, #F5E5BE 0%, #D4AF37 45%, #C59A45 100%);
            color: #0A0C10;
            font-size: 14px;
            font-weight: 700;
            padding: 14px 32px;
            border-radius: 9999px;
            text-decoration: none;
            transition: all 0.2s ease;
            box-shadow: 0 4px 20px rgba(197, 154, 69, 0.3);
          }

          .cta:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 30px rgba(197, 154, 69, 0.45);
          }

          .lang-switch {
            font-size: 12px;
            font-weight: 600;
            color: #8E9BAE;
            text-decoration: none;
            letter-spacing: 0.04em;
            transition: color 0.15s;
          }

          .lang-switch:hover {
            color: #DDA752;
          }
        `}</style>
      </head>
      <body>
        <div className="card">
          <div className="wordmark">
            <div className="logo-ring">
              <span className="logo-monogram">ZF</span>
            </div>
            <span className="brand-name">{copy.brand}</span>
            <span className="brand-tagline">{copy.tagline}</span>
          </div>

          <div className="divider" />

          <div className="badge">
            <span className="badge-dot" />
            {copy.badge}
          </div>

          <h1>
            {isAr ? (
              <>نُطوّر <span>تجربة الاستعراض</span> الفاخرة</>
            ) : (
              <>Curating <span>Exceptional Improvements</span></>
            )}
          </h1>

          <p className="sub">{copy.sub}</p>

          <div className="progress-bar" />

          <a href={whatsappUrl} className="cta" target="_blank" rel="noopener noreferrer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          {copy.cta}
        </a>

        <a href={copy.switchUrl} className="lang-switch">
          {copy.switchLang}
        </a>
      </div>
    </body>
  </html>
  );
}
