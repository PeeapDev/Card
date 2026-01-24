import type { VercelRequest, VercelResponse } from '@vercel/node';

const SCHOOL_API_BASE = 'https://gov.school.edu.sl/api/peeap';

/**
 * POST /api/school/verify-student
 *
 * Proxies requests to the school API to avoid CORS issues.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const response = await fetch(`${SCHOOL_API_BASE}/verify-student`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error: any) {
    console.error('Proxy error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to connect to school system',
      error: error.message,
    });
  }
}
