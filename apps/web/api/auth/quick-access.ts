import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * POST /api/auth/quick-access
 *
 * Handles POST requests from SDSL2 with the JWT token in the body.
 * Redirects to the frontend quick-access page with the token as a URL parameter.
 *
 * This is needed because some WAFs/ModSecurity corrupt tokens in URLs,
 * so SDSL2 sends the token via POST instead.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    // Handle form data (application/x-www-form-urlencoded)
    const token = req.body?.token;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required',
      });
    }

    // Redirect to the frontend quick-access page with the token
    const redirectUrl = `/auth/quick-access?token=${encodeURIComponent(token)}`;

    // Use 303 See Other for POST-to-GET redirect
    return res.redirect(303, redirectUrl);
  }

  // For GET requests, just redirect to the page (token should be in query)
  if (req.method === 'GET') {
    const token = req.query.token as string;

    if (token) {
      return res.redirect(303, `/auth/quick-access?token=${encodeURIComponent(token)}`);
    }

    return res.redirect(303, '/auth/quick-access');
  }

  return res.status(405).json({
    success: false,
    message: 'Method not allowed',
  });
}
