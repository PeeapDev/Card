/**
 * Simple Test Checkout Page - For Debugging
 */

import { useParams } from 'react-router-dom';

export function TestCheckoutPage() {
  const { sessionId } = useParams<{ sessionId: string }>();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '2rem'
    }}>
      <div style={{
        background: 'white',
        padding: '3rem',
        borderRadius: '1rem',
        maxWidth: '600px',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>✅ Route Works!</h1>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          Session ID: <code style={{ background: '#f3f4f6', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>{sessionId}</code>
        </p>
        <p style={{ color: '#6b7280' }}>
          The checkout page route is working correctly.
          Now we can add the full checkout functionality.
        </p>

        <div style={{ marginTop: '2rem', padding: '1rem', background: '#f3f4f6', borderRadius: '0.5rem' }}>
          <p style={{ fontSize: '0.9rem', color: '#4b5563' }}>
            <strong>Next steps:</strong><br/>
            1. Make sure merchant service is running on port 3005<br/>
            2. Make sure API gateway is running on port 3000<br/>
            3. Replace this test page with the full HostedCheckoutPage
          </p>
        </div>
      </div>
    </div>
  );
}
