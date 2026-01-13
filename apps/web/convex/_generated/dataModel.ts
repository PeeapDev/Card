/* eslint-disable */
/**
 * Generated Convex Data Model - Placeholder
 * Run `npx convex dev` to generate actual types
 */

import { GenericId } from "convex/values";

// Table names for this schema
export type TableNames =
  | "conversations"
  | "messages"
  | "flaggedMessages"
  | "cannedResponses"
  | "notifications"
  | "notificationSubscriptions"
  | "presence";

// Generic Id type for all tables
export type Id<TableName extends TableNames> = GenericId<TableName>;

// Placeholder DataModel
export type DataModel = {
  conversations: any;
  messages: any;
  flaggedMessages: any;
  cannedResponses: any;
  notifications: any;
  notificationSubscriptions: any;
  presence: any;
};
