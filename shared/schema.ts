import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Basic User Schema with subscription tiers
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  // Subscription information
  subscriptionTier: text("subscription_tier").notNull().default('free'), // 'free', 'basic', 'pro'
  searchCount: integer("search_count").notNull().default(0), // Track searches for limiting free users
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
});

// Search History
export const searchHistory = pgTable("search_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  query: text("query").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Saved Searches
export const savedSearches = pgTable("saved_searches", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  query: text("query").notNull(),
  aiAnswer: jsonb("ai_answer"),
  results: jsonb("results"),
  savedAt: timestamp("saved_at").defaultNow(),
});

// Search Feedback
export const searchFeedback = pgTable("search_feedback", {
  id: serial("id").primaryKey(),
  searchId: integer("search_id").references(() => searchHistory.id),
  userId: integer("user_id").references(() => users.id),
  feedbackType: text("feedback_type").notNull(), // 'like', 'dislike', etc.
  comment: text("comment"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  subscriptionTier: true,
  searchCount: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  subscriptionExpiresAt: true
});

export const insertSearchHistorySchema = createInsertSchema(searchHistory).pick({
  userId: true,
  query: true,
});

export const insertSavedSearchSchema = createInsertSchema(savedSearches).pick({
  userId: true,
  query: true,
  aiAnswer: true,
  results: true,
});

export const insertSearchFeedbackSchema = createInsertSchema(searchFeedback).pick({
  searchId: true,
  userId: true,
  feedbackType: true,
  comment: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertSearchHistory = z.infer<typeof insertSearchHistorySchema>;
export type SearchHistory = typeof searchHistory.$inferSelect;

export type InsertSavedSearch = z.infer<typeof insertSavedSearchSchema>;
export type SavedSearch = typeof savedSearches.$inferSelect;

export type InsertSearchFeedback = z.infer<typeof insertSearchFeedbackSchema>;
export type SearchFeedback = typeof searchFeedback.$inferSelect;
