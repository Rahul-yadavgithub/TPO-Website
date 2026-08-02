'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Fatal App crash:', error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: '1rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          <div style={{ maxWidth: '450px', width: '100%', backgroundColor: 'white', borderRadius: '1.5rem', padding: '2.5rem', textAlign: 'center', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', border: '1px solid #f1f5f9', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '6px', backgroundColor: '#f43f5e' }}></div>
            
            <div style={{ width: '5rem', height: '5rem', backgroundColor: '#fff1f2', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#f43f5e', fontSize: '2.5rem', border: '1px solid #ffe4e6' }}>
              ⚠️
            </div>
            
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '0.75rem' }}>
              Critical System Error
            </h2>
            
            <p style={{ color: '#64748b', marginBottom: '2rem', lineHeight: '1.6', fontSize: '1rem' }}>
              We encountered an unexpected issue while loading the application. The problem has been logged. Please try refreshing to continue.
            </p>
            
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexDirection: 'column' }}>
              <button
                onClick={() => window.location.href = '/'}
                style={{ width: '100%', padding: '0.875rem', backgroundColor: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '0.75rem', fontWeight: '600', cursor: 'pointer', transition: 'background-color 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
              >
                Go to Homepage
              </button>
              
              <button
                onClick={() => reset()}
                style={{ width: '100%', padding: '0.875rem', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: '600', cursor: 'pointer', transition: 'background-color 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4338ca'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4f46e5'}
              >
                <span>↻</span> Try Again
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
