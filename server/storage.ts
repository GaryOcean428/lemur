import { users, type User, type InsertUser, searchHistory, type SearchHistory, type InsertSearchHistory, savedSearches, type SavedSearch, type InsertSavedSearch, searchFeedback, type SearchFeedback, type InsertSearchFeedback, userPreferences, type UserPreferences, type InsertUserPreferences, userTopicInterests, type UserTopicInterest, type InsertUserTopicInterest } from "@shared/schema";
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
  updateStripeInfo(userId: number, customerId: string, subscriptionId: string | null): Promise<User>;
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
  
  // User preferences operations
  getUserPreferences(userId: number): Promise<UserPreferences | undefined>;
  createUserPreferences(prefs: InsertUserPreferences): Promise<UserPreferences>;
  updateUserPreferences(userId: number, prefs: Partial<InsertUserPreferences>): Promise<UserPreferences>;
  
  // User topic interests operations
  getUserTopicInterests(userId: number): Promise<UserTopicInterest[]>;
  createUserTopicInterest(interest: InsertUserTopicInterest): Promise<UserTopicInterest>;
  updateUserTopicInterest(id: number, interestLevel: number): Promise<UserTopicInterest>;
  deleteUserTopicInterest(id: number): Promise<void>;
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

  async updateStripeInfo(userId: number, customerId: string, subscriptionId: string | null): Promise<User> {
    // Create the update data object
    const updateData: any = {
      stripeCustomerId: customerId
    };
    
    // Only add subscriptionId if it's not null
    if (subscriptionId !== null) {
      updateData.stripeSubscriptionId = subscriptionId;
    }
    
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
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
  
  // User preferences operations
  async getUserPreferences(userId: number): Promise<UserPreferences | undefined> {
    const [prefs] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));
    return prefs || undefined;
  }
  
  async createUserPreferences(prefs: InsertUserPreferences): Promise<UserPreferences> {
    const [record] = await db
      .insert(userPreferences)
      .values(prefs)
      .returning();
    return record;
  }
  
  async updateUserPreferences(userId: number, prefs: Partial<InsertUserPreferences>): Promise<UserPreferences> {
    // Ensure we're not overwriting the userId
    const updateData = { ...prefs };
    delete updateData.userId;
    
    // Add last updated timestamp
    const updatePayload = {
      ...updateData,
      lastUpdated: new Date()
    };
    
    const [updatedPrefs] = await db
      .update(userPreferences)
      .set(updatePayload)
      .where(eq(userPreferences.userId, userId))
      .returning();
    
    return updatedPrefs;
  }
  
  // User topic interests operations
  async getUserTopicInterests(userId: number): Promise<UserTopicInterest[]> {
    return await db
      .select()
      .from(userTopicInterests)
      .where(eq(userTopicInterests.userId, userId))
      .orderBy(userTopicInterests.interestLevel, 'desc');
  }
  
  async createUserTopicInterest(interest: InsertUserTopicInterest): Promise<UserTopicInterest> {
    const [record] = await db
      .insert(userTopicInterests)
      .values(interest)
      .returning();
    return record;
  }
  
  async updateUserTopicInterest(id: number, interestLevel: number): Promise<UserTopicInterest> {
    const [record] = await db
      .update(userTopicInterests)
      .set({
        interestLevel,
        updatedAt: new Date()
      })
      .where(eq(userTopicInterests.id, id))
      .returning();
    return record;
  }
  
  async deleteUserTopicInterest(id: number): Promise<void> {
    await db
      .delete(userTopicInterests)
      .where(eq(userTopicInterests.id, id));
  }
}

export const storage = new DatabaseStorage();
