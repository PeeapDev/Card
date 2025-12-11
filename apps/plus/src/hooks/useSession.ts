/**
 * Database-backed session hook for Plus
 * Reads session from cookie and validates against user_sessions table
 */

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export interface SessionUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  roles: string[];
  tier: string;
  businessName?: string;
}

export interface Session {
  user: SessionUser;
  tier: string;
  expiresAt: Date;
}

// Get cookie value
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() || null;
  }
  return null;
}

// Delete cookie
function deleteCookie(name: string) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSession() {
      try {
        const sessionToken = getCookie("plus_session");

        if (!sessionToken) {
          setSession(null);
          setLoading(false);
          return;
        }

        // Validate session against database
        const { data: sessions, error: sessionError } = await supabase
          .from("user_sessions")
          .select("*")
          .eq("session_token", sessionToken)
          .eq("app", "plus")
          .limit(1);

        if (sessionError || !sessions || sessions.length === 0) {
          // Invalid session - clear cookie
          deleteCookie("plus_session");
          setSession(null);
          setLoading(false);
          return;
        }

        const dbSession = sessions[0];

        // Check if session is expired
        if (new Date(dbSession.expires_at) < new Date()) {
          // Expired session - clear cookie and delete from DB
          deleteCookie("plus_session");
          await supabase.from("user_sessions").delete().eq("id", dbSession.id);
          setSession(null);
          setLoading(false);
          return;
        }

        // Fetch user data
        const { data: users, error: userError } = await supabase
          .from("users")
          .select("id, email, first_name, last_name, phone, roles, tier, business_name")
          .eq("id", dbSession.user_id)
          .limit(1);

        if (userError || !users || users.length === 0) {
          deleteCookie("plus_session");
          setSession(null);
          setLoading(false);
          return;
        }

        const user = users[0];

        // Update last activity
        await supabase
          .from("user_sessions")
          .update({ last_activity_at: new Date().toISOString() })
          .eq("id", dbSession.id);

        setSession({
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            phone: user.phone,
            roles: user.roles?.split(",") || ["user"],
            tier: dbSession.tier || user.tier || "basic",
            businessName: user.business_name,
          },
          tier: dbSession.tier || user.tier || "basic",
          expiresAt: new Date(dbSession.expires_at),
        });
      } catch (err) {
        console.error("Session error:", err);
        setError("Failed to load session");
        setSession(null);
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, []);

  const logout = async () => {
    const sessionToken = getCookie("plus_session");
    if (sessionToken) {
      // Delete session from database
      await supabase
        .from("user_sessions")
        .delete()
        .eq("session_token", sessionToken);
    }
    deleteCookie("plus_session");
    setSession(null);
  };

  return {
    session,
    user: session?.user || null,
    tier: session?.tier || null,
    loading,
    error,
    isAuthenticated: !!session,
    logout,
  };
}
