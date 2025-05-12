import { pgTable, text, serial, integer, boolean, jsonb, timestamp, varchar, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
// Basic User Schema with subscription tiers
export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    username: text("username").notNull().unique(),
    password: text("password").notNull(),
    email: text("email").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow(),
    // User role information
    isDeveloper: boolean("is_developer").default(false), // Special flag for developers and admins
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
// User Preferences for personalization
export const userPreferences = pgTable("user_preferences", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id).notNull(),
    defaultRegion: varchar("default_region", { length: 10 }).default('global'),
    preferredLanguage: varchar("preferred_language", { length: 10 }).default('en'),
    contentPreferences: json("content_preferences").default({}),
    searchFilters: json("search_filters").default({}),
    aiModel: varchar("ai_model", { length: 30 }).default('auto'),
    lastUpdated: timestamp("last_updated").defaultNow(),
});
// User Topic Interests - for content personalization
export const userTopicInterests = pgTable("user_topic_interests", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id).notNull(),
    topic: varchar("topic", { length: 100 }).notNull(),
    interestLevel: integer("interest_level").default(1), // 1-5 scale
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
// Schemas
export const insertUserSchema = createInsertSchema(users).pick({
    username: true,
    password: true,
    email: true,
    isDeveloper: true,
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
export const insertUserPreferencesSchema = createInsertSchema(userPreferences).pick({
    userId: true,
    defaultRegion: true,
    preferredLanguage: true,
    contentPreferences: true,
    searchFilters: true,
    aiModel: true,
});
export const insertUserTopicInterestSchema = createInsertSchema(userTopicInterests).pick({
    userId: true,
    topic: true,
    interestLevel: true,
});
