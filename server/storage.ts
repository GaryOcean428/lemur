import { users, type User, type InsertUser, searchHistory, type SearchHistory, type InsertSearchHistory, savedSearches, type SavedSearch, type InsertSavedSearch, searchFeedback, type SearchFeedback, type InsertSearchFeedback } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Search history operations
  createSearchHistory(history: InsertSearchHistory): Promise<SearchHistory>;
  getSearchHistoryByUserId(userId: number): Promise<SearchHistory[]>;
  
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
  
  // Search history operations
  async createSearchHistory(history: InsertSearchHistory): Promise<SearchHistory> {
    const [record] = await db
      .insert(searchHistory)
      .values(history)
      .returning();
    return record;
  }
  
  async getSearchHistoryByUserId(userId: number): Promise<SearchHistory[]> {
    return await db
      .select()
      .from(searchHistory)
      .where(eq(searchHistory.userId, userId))
      .orderBy(searchHistory.timestamp);
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
