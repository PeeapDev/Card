"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Debug page to test SSO token validation
 * Access at: https://plus.peeap.com/auth/debug
 */
export default function AuthDebugPage() {
  const [token, setToken] = useState("");
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  interface TokenPayload {
    userId?: string;
    email?: string;
    roles?: string[];
    tier?: string;
    exp?: number;
  }

  const testToken = async () => {
    setLoading(true);
    setResult("");

    try {
      // Step 1: Decode the token
      let payload: TokenPayload;
      try {
        payload = JSON.parse(atob(token)) as TokenPayload;
        setResult(prev => prev + `\n✅ Token decoded successfully:\n${JSON.stringify(payload, null, 2)}\n`);
      } catch (e) {
        setResult(`❌ Failed to decode token: ${e}`);
        setLoading(false);
        return;
      }

      // Step 2: Check expiration
      if (!payload.exp || payload.exp < Date.now()) {
        setResult(prev => prev + `\n❌ Token expired at ${payload.exp ? new Date(payload.exp).toISOString() : 'unknown'}\n`);
        setLoading(false);
        return;
      }
      setResult(prev => prev + `\n✅ Token not expired. Expires at ${new Date(payload.exp!).toISOString()}\n`);

      // Step 3: Check userId
      if (!payload.userId) {
        setResult(prev => prev + `\n❌ No userId in token payload\n`);
        setLoading(false);
        return;
      }
      setResult(prev => prev + `\n✅ UserId found: ${payload.userId}\n`);

      // Step 4: Query Supabase
      setResult(prev => prev + `\n🔍 Querying Supabase for user...\n`);

      const { data: users, error } = await supabase
        .from("users")
        .select("id, email, first_name, last_name, roles, tier")
        .eq("id", payload.userId)
        .limit(1);

      if (error) {
        setResult(prev => prev + `\n❌ Supabase error: ${error.message}\n`);
        setLoading(false);
        return;
      }

      if (!users || users.length === 0) {
        setResult(prev => prev + `\n❌ No user found with id: ${payload.userId}\n`);

        // Try to find by email as fallback
        if (payload.email) {
          setResult(prev => prev + `\n🔍 Trying to find by email: ${payload.email}\n`);
          const { data: emailUsers, error: emailError } = await supabase
            .from("users")
            .select("id, email, first_name, last_name, roles, tier")
            .eq("email", payload.email)
            .limit(1);

          if (emailError) {
            setResult(prev => prev + `\n❌ Email search error: ${emailError.message}\n`);
          } else if (emailUsers && emailUsers.length > 0) {
            setResult(prev => prev + `\n⚠️ User found by email but ID doesn't match!\n`);
            setResult(prev => prev + `Token userId: ${payload.userId}\n`);
            setResult(prev => prev + `Database id: ${emailUsers[0].id}\n`);
            setResult(prev => prev + `\nThis means the userId in the token is incorrect.\n`);
          }
        }

        setLoading(false);
        return;
      }

      setResult(prev => prev + `\n✅ User found in database:\n${JSON.stringify(users[0], null, 2)}\n`);
      setResult(prev => prev + `\n🎉 SSO SHOULD WORK! Token is valid and user exists.\n`);

    } catch (e) {
      setResult(prev => prev + `\n❌ Unexpected error: ${e}\n`);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">SSO Token Debug</h1>
        <p className="text-gray-600 mb-6">
          Paste your token from my.peeap.com localStorage (accessToken) to test if SSO will work.
        </p>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Token (from localStorage accessToken)</label>
            <textarea
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full h-32 p-3 border rounded-lg font-mono text-xs"
              placeholder="Paste your base64 token here..."
            />
          </div>

          <button
            onClick={testToken}
            disabled={loading || !token}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? "Testing..." : "Test Token"}
          </button>

          {result && (
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Result</label>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto text-xs whitespace-pre-wrap">
                {result}
              </pre>
            </div>
          )}
        </div>

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-medium text-yellow-800 mb-2">How to get your token:</h3>
          <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
            <li>Go to my.peeap.com and login</li>
            <li>Open browser DevTools (F12)</li>
            <li>Go to Application → Local Storage → my.peeap.com</li>
            <li>Copy the value of "accessToken"</li>
            <li>Paste it here</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
