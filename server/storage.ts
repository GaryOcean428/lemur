import { users, type User, type InsertUser, searchHistory, type SearchHistory, type InsertSearchHistory, savedSearches, type SavedSearch, type InsertSavedSearch, searchFeedback, type SearchFeedback, type InsertSearchFeedback } from "@shared/schema";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserSubscription(userId: number, tier: string, expiresAt?: Date): Promise<User>;
  incrementUserSearchCount(userId: number): Promise<User>;
  updateStripeInfo(userId: number, customerId: string, subscriptionId: string): Promise<User>;
  isFirstUser(): Promise<boolean>; // Check if this is the first user being created
  
  // Search history operations
  createSearchHistory(history: InsertSearchHistory): Promise<SearchHistory>;
  getSearchHistoryByUserId(userId: number | null): Promise<SearchHistory[]>;
  
  // Saved searches operations
  saveSearch(savedSearch: InsertSavedSearch): Promise<SavedSearch>;
  getSavedSearchesByUserId(userId: number): Promise<SavedSearch[]>;
  
  // Search feedback operations
  createSearchFeedback(feedback: InsertSearchFeedback): Promise<SearchFeedback>;
  getSearchFeedbackBySearchId(searchId: number): Promise<SearchFeedback[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserSubscription(userId: number, tier: string, expiresAt?: Date): Promise<User> {
    const updateData: any = {
      subscriptionTier: tier
    };
    
    if (expiresAt) {
      updateData.subscriptionExpiresAt = expiresAt;
    }
    
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }

  async incrementUserSearchCount(userId: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        searchCount: sql`${users.searchCount} + 1`
      })
      .where(eq(users.id, userId))
      .returning();
    
    return user;
  }

  async updateStripeInfo(userId: number, customerId: string, subscriptionId: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId
      })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }
  
  async isFirstUser(): Promise<boolean> {
    // Check if there are any existing users in the database
    const userCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);
    
    return userCount[0].count === 0;
  }
  
  // Search history operations
  async createSearchHistory(history: InsertSearchHistory): Promise<SearchHistory> {
    const [record] = await db
      .insert(searchHistory)
      .values(history)
      .returning();
    return record;
  }
  
  async getSearchHistoryByUserId(userId: number | null): Promise<SearchHistory[]> {
    try {
      if (userId) {
        // Get search history for specific user
        return await db
          .select()
          .from(searchHistory)
          .where(eq(searchHistory.userId, userId))
          .orderBy(searchHistory.timestamp);
      } else {
        // Get all anonymous search history (null userId)
        // We use a direct SQL query to properly handle NULL values
        return await db
          .select()
          .from(searchHistory)
          .where(sql`${searchHistory.userId} IS NULL`)
          .orderBy(searchHistory.timestamp);
      }
    } catch (error) {
      console.error("Error fetching search history:", error);
      throw error;
    }
  }
  
  // Saved searches operations
  async saveSearch(savedSearch: InsertSavedSearch): Promise<SavedSearch> {
    const [record] = await db
      .insert(savedSearches)
      .values(savedSearch)
      .returning();
    return record;
  }
  
  async getSavedSearchesByUserId(userId: number): Promise<SavedSearch[]> {
    return await db
      .select()
      .from(savedSearches)
      .where(eq(savedSearches.userId, userId))
      .orderBy(savedSearches.savedAt);
  }
  
  // Search feedback operations
  async createSearchFeedback(feedback: InsertSearchFeedback): Promise<SearchFeedback> {
    const [record] = await db
      .insert(searchFeedback)
      .values(feedback)
      .returning();
    return record;
  }
  
  async getSearchFeedbackBySearchId(searchId: number): Promise<SearchFeedback[]> {
    return await db
      .select()
      .from(searchFeedback)
      .where(eq(searchFeedback.searchId, searchId));
  }
}

export const storage = new DatabaseStorage();
