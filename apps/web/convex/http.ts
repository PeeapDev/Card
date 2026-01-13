import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

const http = httpRouter();

// ============================================================================
// NOTIFICATION ENDPOINTS (for backend to push notifications)
// ============================================================================

/**
 * POST /api/notifications
 * Create a new notification from the backend
 *
 * Headers:
 *   X-API-Key: Your Convex API key for authentication
 *
 * Body:
 * {
 *   "userId": "supabase-user-id",
 *   "type": "payment_received",
 *   "title": "Payment Received",
 *   "message": "You received $100 from John",
 *   "actionUrl": "/dashboard/transactions/123",
 *   "actionData": { "transactionId": "123" },
 *   "priority": "normal"
 * }
 */
http.route({
  path: "/api/notifications",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Verify API key
    const apiKey = request.headers.get("X-API-Key");
    const expectedKey = process.env.CONVEX_HTTP_API_KEY;

    if (!apiKey || apiKey !== expectedKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body = await request.json();

      // Validate required fields
      if (!body.userId || !body.type || !body.title || !body.message) {
        return new Response(
          JSON.stringify({
            error: "Missing required fields: userId, type, title, message",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Create notification using the mutation
      const notificationId = await ctx.runMutation(
        api.notifications.createNotification,
        {
          userId: body.userId,
          type: body.type,
          title: body.title,
          message: body.message,
          icon: body.icon,
          actionUrl: body.actionUrl,
          actionData: body.actionData,
          sourceService: body.sourceService,
          priority: body.priority ?? "normal",
        }
      );

      return new Response(
        JSON.stringify({
          success: true,
          notificationId: notificationId,
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error creating notification:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to create notification",
          details: error instanceof Error ? error.message : "Unknown error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }),
});

/**
 * POST /api/notifications/batch
 * Create multiple notifications at once
 *
 * Body:
 * {
 *   "notifications": [
 *     { "userId": "...", "type": "...", "title": "...", "message": "..." },
 *     ...
 *   ]
 * }
 */
http.route({
  path: "/api/notifications/batch",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const apiKey = request.headers.get("X-API-Key");
    const expectedKey = process.env.CONVEX_HTTP_API_KEY;

    if (!apiKey || apiKey !== expectedKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body = await request.json();

      if (!body.notifications || !Array.isArray(body.notifications)) {
        return new Response(
          JSON.stringify({ error: "notifications array is required" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const results = await Promise.all(
        body.notifications.map(async (notification: any) => {
          try {
            const id = await ctx.runMutation(
              api.notifications.createNotification,
              {
                userId: notification.userId,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                icon: notification.icon,
                actionUrl: notification.actionUrl,
                actionData: notification.actionData,
                sourceService: notification.sourceService,
                priority: notification.priority ?? "normal",
              }
            );
            return { success: true, notificationId: id };
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            };
          }
        })
      );

      return new Response(
        JSON.stringify({
          success: true,
          results,
          created: results.filter((r) => r.success).length,
          failed: results.filter((r) => !r.success).length,
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Failed to create notifications",
          details: error instanceof Error ? error.message : "Unknown error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }),
});

// ============================================================================
// CHAT ENDPOINTS (for backend to send system messages)
// ============================================================================

/**
 * POST /api/chat/system-message
 * Send a system message to a conversation
 *
 * Body:
 * {
 *   "conversationId": "convex-conversation-id",
 *   "content": "System message content",
 *   "messageType": "system"
 * }
 */
http.route({
  path: "/api/chat/system-message",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const apiKey = request.headers.get("X-API-Key");
    const expectedKey = process.env.CONVEX_HTTP_API_KEY;

    if (!apiKey || apiKey !== expectedKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body = await request.json();

      if (!body.conversationId || !body.content) {
        return new Response(
          JSON.stringify({
            error: "Missing required fields: conversationId, content",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const messageId = await ctx.runMutation(api.chat.sendMessage, {
        conversationId: body.conversationId,
        senderId: "system",
        senderType: "system",
        senderName: "System",
        content: body.content,
        messageType: body.messageType ?? "system",
      });

      return new Response(
        JSON.stringify({
          success: true,
          messageId,
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Failed to send system message",
          details: error instanceof Error ? error.message : "Unknown error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }),
});

/**
 * POST /api/chat/ai-message
 * Send an AI moderation warning message
 */
http.route({
  path: "/api/chat/ai-message",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const apiKey = request.headers.get("X-API-Key");
    const expectedKey = process.env.CONVEX_HTTP_API_KEY;

    if (!apiKey || apiKey !== expectedKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body = await request.json();

      const messageId = await ctx.runMutation(api.chat.sendMessage, {
        conversationId: body.conversationId,
        senderId: "ai-moderator",
        senderType: "ai",
        senderName: "AI Moderator",
        content: body.content,
        messageType: "ai_warning",
        metadata: body.metadata,
      });

      return new Response(
        JSON.stringify({
          success: true,
          messageId,
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Failed to send AI message",
          details: error instanceof Error ? error.message : "Unknown error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }),
});

// ============================================================================
// WEBHOOK ENDPOINTS (for external services)
// ============================================================================

/**
 * POST /api/webhooks/payment
 * Receive payment webhook and create notification
 */
http.route({
  path: "/api/webhooks/payment",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const apiKey = request.headers.get("X-API-Key");
    const expectedKey = process.env.CONVEX_HTTP_API_KEY;

    if (!apiKey || apiKey !== expectedKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body = await request.json();

      // Determine notification type based on event
      let notificationType: string;
      let title: string;
      let message: string;

      switch (body.event) {
        case "payment.received":
          notificationType = "payment_received";
          title = "Payment Received";
          message = `You received ${body.currency} ${body.amount} from ${body.from ?? "someone"}`;
          break;
        case "payment.sent":
          notificationType = "payment_sent";
          title = "Payment Sent";
          message = `You sent ${body.currency} ${body.amount} to ${body.to ?? "someone"}`;
          break;
        case "payment.failed":
          notificationType = "payment_failed";
          title = "Payment Failed";
          message = `Payment of ${body.currency} ${body.amount} failed: ${body.reason ?? "Unknown error"}`;
          break;
        case "payout.completed":
          notificationType = "payout_completed";
          title = "Payout Completed";
          message = `Your payout of ${body.currency} ${body.amount} has been completed`;
          break;
        default:
          notificationType = "transaction_completed";
          title = "Transaction Update";
          message = body.message ?? "A transaction has been processed";
      }

      await ctx.runMutation(api.notifications.createNotification, {
        userId: body.userId,
        type: notificationType,
        title,
        message,
        actionUrl: body.transactionId
          ? `/dashboard/transactions/${body.transactionId}`
          : "/dashboard/transactions",
        actionData: {
          transactionId: body.transactionId,
          amount: body.amount,
          currency: body.currency,
        },
        sourceService: "payments",
        priority:
          notificationType === "payment_failed" ? "high" : "normal",
      });

      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Failed to process webhook",
          details: error instanceof Error ? error.message : "Unknown error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }),
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

http.route({
  path: "/api/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(
      JSON.stringify({
        status: "ok",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }),
});

export default http;
