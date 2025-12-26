/**
 * Push Notification Service
 *
 * Handles sending push notifications via Firebase Cloud Messaging (FCM)
 * to users based on their stored FCM tokens.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs';

// Firebase Server Key for FCM HTTP v1 API (legacy) - get from Firebase Console > Project Settings > Cloud Messaging
const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, string>;
  click_action?: string;
}

export interface SendNotificationRequest {
  userId?: string;
  userIds?: string[];
  role?: string; // 'all' | 'user' | 'merchant' | 'driver' | 'admin'
  notification: NotificationPayload;
}

export interface SendNotificationResult {
  success: boolean;
  sent: number;
  failed: number;
  errors?: string[];
}

/**
 * Get FCM tokens for specified users
 */
export async function getFcmTokensForUsers(userIds: string[]): Promise<{ userId: string; token: string }[]> {
  const { data, error } = await supabase
    .from('fcm_tokens')
    .select('user_id, token')
    .in('user_id', userIds)
    .eq('is_active', true);

  if (error) {
    console.error('[PushNotification] Error fetching tokens:', error);
    return [];
  }

  return data?.map(t => ({ userId: t.user_id, token: t.token })) || [];
}

/**
 * Get FCM tokens for users by role
 */
export async function getFcmTokensByRole(role: string): Promise<{ userId: string; token: string }[]> {
  let query = supabase
    .from('fcm_tokens')
    .select(`
      user_id,
      token,
      users!inner(role)
    `)
    .eq('is_active', true);

  if (role !== 'all') {
    query = query.eq('users.role', role);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[PushNotification] Error fetching tokens by role:', error);
    return [];
  }

  return data?.map(t => ({ userId: t.user_id, token: t.token })) || [];
}

/**
 * Get all active FCM tokens
 */
export async function getAllFcmTokens(): Promise<{ userId: string; token: string }[]> {
  const { data, error } = await supabase
    .from('fcm_tokens')
    .select('user_id, token')
    .eq('is_active', true);

  if (error) {
    console.error('[PushNotification] Error fetching all tokens:', error);
    return [];
  }

  return data?.map(t => ({ userId: t.user_id, token: t.token })) || [];
}

/**
 * Send push notification to a single FCM token using FCM HTTP API
 */
export async function sendToToken(
  token: string,
  notification: NotificationPayload
): Promise<{ success: boolean; error?: string }> {
  if (!FCM_SERVER_KEY) {
    console.warn('[PushNotification] FCM_SERVER_KEY not configured, using mock send');
    // In development/testing, return success without actually sending
    return { success: true };
  }

  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${FCM_SERVER_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title: notification.title,
          body: notification.body,
          icon: notification.icon || '/icons/icon-192x192.png',
          badge: notification.badge || '/icons/badge-72x72.png',
          click_action: notification.click_action || '/',
        },
        data: notification.data || {},
        webpush: {
          headers: {
            Urgency: 'high',
          },
          notification: {
            title: notification.title,
            body: notification.body,
            icon: notification.icon || '/icons/icon-192x192.png',
            badge: notification.badge || '/icons/badge-72x72.png',
            requireInteraction: true,
          },
        },
      }),
    });

    const result = await response.json();

    if (result.success === 1) {
      return { success: true };
    }

    // Handle token errors - mark token as inactive
    if (result.results?.[0]?.error === 'NotRegistered' || result.results?.[0]?.error === 'InvalidRegistration') {
      await deactivateToken(token);
      return { success: false, error: result.results[0].error };
    }

    return { success: false, error: result.results?.[0]?.error || 'Unknown FCM error' };
  } catch (error: any) {
    console.error('[PushNotification] Error sending to token:', error);
    return { success: false, error: error.message || 'Failed to send notification' };
  }
}

/**
 * Send push notification to multiple tokens
 */
export async function sendToTokens(
  tokens: { userId: string; token: string }[],
  notification: NotificationPayload
): Promise<SendNotificationResult> {
  if (tokens.length === 0) {
    return { success: true, sent: 0, failed: 0 };
  }

  const results = await Promise.all(
    tokens.map(t => sendToToken(t.token, notification))
  );

  const sent = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const errors = results
    .filter(r => !r.success && r.error)
    .map(r => r.error as string);

  return {
    success: failed === 0,
    sent,
    failed,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Deactivate an FCM token (mark as inactive)
 */
export async function deactivateToken(token: string): Promise<void> {
  const { error } = await supabase
    .from('fcm_tokens')
    .update({ is_active: false })
    .eq('token', token);

  if (error) {
    console.error('[PushNotification] Error deactivating token:', error);
  }
}

/**
 * Send notification to user(s) based on request parameters
 */
export async function sendNotification(request: SendNotificationRequest): Promise<SendNotificationResult> {
  let tokens: { userId: string; token: string }[] = [];

  if (request.userId) {
    // Single user
    tokens = await getFcmTokensForUsers([request.userId]);
  } else if (request.userIds && request.userIds.length > 0) {
    // Multiple specific users
    tokens = await getFcmTokensForUsers(request.userIds);
  } else if (request.role) {
    // Users by role
    if (request.role === 'all') {
      tokens = await getAllFcmTokens();
    } else {
      tokens = await getFcmTokensByRole(request.role);
    }
  } else {
    return { success: false, sent: 0, failed: 0, errors: ['No target specified'] };
  }

  console.log(`[PushNotification] Sending to ${tokens.length} tokens`);

  return sendToTokens(tokens, request.notification);
}

/**
 * Store a notification in the database (for history/audit)
 */
export async function storeNotification(
  senderId: string,
  request: SendNotificationRequest,
  result: SendNotificationResult
): Promise<void> {
  try {
    await supabase.from('admin_notifications').insert({
      sender_id: senderId,
      title: request.notification.title,
      body: request.notification.body,
      target_type: request.role || (request.userIds ? 'specific' : 'single'),
      target_ids: request.userIds || (request.userId ? [request.userId] : null),
      sent_count: result.sent,
      failed_count: result.failed,
      errors: result.errors,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[PushNotification] Error storing notification:', error);
  }
}

/**
 * Get notification history
 */
export async function getNotificationHistory(limit = 50): Promise<any[]> {
  const { data, error } = await supabase
    .from('admin_notifications')
    .select(`
      *,
      sender:users!sender_id(full_name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[PushNotification] Error fetching history:', error);
    return [];
  }

  return data || [];
}

/**
 * Get users with active FCM tokens (for admin to select recipients)
 */
export async function getUsersWithTokens(): Promise<any[]> {
  const { data, error } = await supabase
    .from('fcm_tokens')
    .select(`
      user_id,
      users!inner(id, full_name, email, phone, role)
    `)
    .eq('is_active', true);

  if (error) {
    console.error('[PushNotification] Error fetching users with tokens:', error);
    return [];
  }

  // Deduplicate by user_id
  const userMap = new Map();
  data?.forEach(t => {
    if (!userMap.has(t.user_id)) {
      userMap.set(t.user_id, t.users);
    }
  });

  return Array.from(userMap.values());
}

/**
 * Get token count statistics
 */
export async function getTokenStats(): Promise<{ total: number; byPlatform: Record<string, number>; byRole: Record<string, number> }> {
  // Get total active tokens
  const { count: total } = await supabase
    .from('fcm_tokens')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  // Get by platform
  const { data: platformData } = await supabase
    .from('fcm_tokens')
    .select('platform')
    .eq('is_active', true);

  const byPlatform: Record<string, number> = {};
  platformData?.forEach(t => {
    const platform = t.platform || 'web';
    byPlatform[platform] = (byPlatform[platform] || 0) + 1;
  });

  // Get by role (join with users)
  const { data: roleData } = await supabase
    .from('fcm_tokens')
    .select(`
      user_id,
      users!inner(role)
    `)
    .eq('is_active', true);

  const byRole: Record<string, number> = {};
  const seenUsers = new Set();
  roleData?.forEach((t: any) => {
    if (!seenUsers.has(t.user_id)) {
      seenUsers.add(t.user_id);
      const role = t.users?.role || 'user';
      byRole[role] = (byRole[role] || 0) + 1;
    }
  });

  return {
    total: total || 0,
    byPlatform,
    byRole,
  };
}
