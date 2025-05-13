# Tool Page Schema Extensions

**Date:** May 13, 2025

## Overview

This document outlines the database schema extensions needed to support the Tool Page features. These extensions will be implemented in `shared/schema.ts` using Drizzle ORM.

## Schema Extensions

### 1. User Tool Preferences

```typescript
// In shared/schema.ts

export const userToolPreferences = pgTable("user_tool_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  toolId: text("tool_id").notNull(), // Identifier for the tool (e.g., "summarizer", "citation-generator")
  settings: json("settings").default({}), // JSON object with tool-specific settings
  lastUsed: timestamp("last_used").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserToolPreferencesSchema = createInsertSchema(userToolPreferences).pick({
  userId: true,
  toolId: true,
  settings: true,
});

export type InsertUserToolPreferences = z.infer<typeof insertUserToolPreferencesSchema>;
export type UserToolPreferences = typeof userToolPreferences.$inferSelect;
```

### 2. Saved Searches (Extended)

The existing `savedSearches` table will be extended with additional fields to support the Saved Searches tool:

```typescript
// In shared/schema.ts

// Extend existing savedSearches table
export const savedSearches = pgTable("saved_searches", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  query: text("query").notNull(),
  results: json("results").default([]),
  aiAnswer: json("ai_answer").default({}),
  savedAt: timestamp("saved_at").defaultNow(),
  lastUpdated: timestamp("last_updated").defaultNow(),
  
  // New fields
  folder: text("folder"),  // For organizing searches into folders
  tags: text("tags").array(), // Array of tags for categorization
  notes: text("notes"), // User notes about this search
  isStarred: boolean("is_starred").default(false), // For marking important searches
  customName: text("custom_name"), // User-defined name for the search
});

export const insertSavedSearchSchema = createInsertSchema(savedSearches).pick({
  userId: true,
  query: true,
  results: true,
  aiAnswer: true,
  folder: true,
  tags: true,
  notes: true,
  isStarred: true,
  customName: true,
});

export type InsertSavedSearch = z.infer<typeof insertSavedSearchSchema>;
export type SavedSearch = typeof savedSearches.$inferSelect;
```

### 3. Research Projects

```typescript
// In shared/schema.ts

export const researchProjects = pgTable("research_projects", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  lastUpdated: timestamp("last_updated").defaultNow(),
  status: text("status").notNull().default("active"), // 'active', 'archived', 'completed'
  color: text("color").default("#4b5563"), // For visual organization
});

export const insertResearchProjectSchema = createInsertSchema(researchProjects).pick({
  userId: true,
  name: true,
  description: true,
  status: true,
  color: true,
});

export type InsertResearchProject = z.infer<typeof insertResearchProjectSchema>;
export type ResearchProject = typeof researchProjects.$inferSelect;
```

### 4. Project Items (for Research Dashboard)

```typescript
// In shared/schema.ts

export const projectItems = pgTable("project_items", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => researchProjects.id, { onDelete: "cascade" }),
  itemType: text("item_type").notNull(), // 'search', 'note', 'url', 'document'
  itemId: integer("item_id"), // Reference to another entity like savedSearches.id (if applicable)
  content: text("content"), // Direct content for notes or other simple items
  metadata: json("metadata").default({}), // Additional metadata
  createdAt: timestamp("created_at").defaultNow(),
  position: integer("position").default(0), // For ordering items within a project
});

export const insertProjectItemSchema = createInsertSchema(projectItems).pick({
  projectId: true,
  itemType: true,
  itemId: true,
  content: true,
  metadata: true,
  position: true,
});

export type InsertProjectItem = z.infer<typeof insertProjectItemSchema>;
export type ProjectItem = typeof projectItems.$inferSelect;
```

### 5. Generated Citations

```typescript
// In shared/schema.ts

export const generatedCitations = pgTable("generated_citations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sourceUrl: text("source_url"),
  sourceMetadata: json("source_metadata").default({}), // Title, author, date, etc.
  styles: json("styles").default({}), // Object with citations in different styles
  createdAt: timestamp("created_at").defaultNow(),
  lastUsed: timestamp("last_used").defaultNow(),
});

export const insertGeneratedCitationSchema = createInsertSchema(generatedCitations).pick({
  userId: true,
  sourceUrl: true,
  sourceMetadata: true,
  styles: true,
});

export type InsertGeneratedCitation = z.infer<typeof insertGeneratedCitationSchema>;
export type GeneratedCitation = typeof generatedCitations.$inferSelect;
```

### 6. Domain Research Results

```typescript
// In shared/schema.ts

export const domainResearch = pgTable("domain_research", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  domain: text("domain").notNull(),
  analysisResults: json("analysis_results").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const insertDomainResearchSchema = createInsertSchema(domainResearch).pick({
  userId: true,
  domain: true,
  analysisResults: true,
});

export type InsertDomainResearch = z.infer<typeof insertDomainResearchSchema>;
export type DomainResearch = typeof domainResearch.$inferSelect;
```

### 7. Content Summaries

```typescript
// In shared/schema.ts

export const contentSummaries = pgTable("content_summaries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sourceUrl: text("source_url"),
  sourceText: text("source_text"), // Original text if directly provided
  summary: text("summary").notNull(),
  summaryType: text("summary_type").default("standard"), // 'standard', 'detailed', 'keypoints'
  createdAt: timestamp("created_at").defaultNow(),
  metadata: json("metadata").default({}), // Source title, length, etc.
});

export const insertContentSummarySchema = createInsertSchema(contentSummaries).pick({
  userId: true,
  sourceUrl: true,
  sourceText: true,
  summary: true,
  summaryType: true,
  metadata: true,
});

export type InsertContentSummary = z.infer<typeof insertContentSummarySchema>;
export type ContentSummary = typeof contentSummaries.$inferSelect;
```

## Storage Interface Extensions

The following methods will need to be added to the `IStorage` interface in `server/storage.ts`:

```typescript
// In server/storage.ts

export interface IStorage {
  // ... existing methods ...
  
  // User Tool Preferences operations
  getUserToolPreferences(userId: number, toolId: string): Promise<UserToolPreferences | undefined>;
  createUserToolPreferences(prefs: InsertUserToolPreferences): Promise<UserToolPreferences>;
  updateUserToolPreferences(userId: number, toolId: string, settings: any): Promise<UserToolPreferences>;
  
  // Enhanced Saved Searches operations
  updateSavedSearch(id: number, updates: Partial<InsertSavedSearch>): Promise<SavedSearch>;
  getSavedSearchesByFolder(userId: number, folder: string | null): Promise<SavedSearch[]>;
  getSavedSearchesByTag(userId: number, tag: string): Promise<SavedSearch[]>;
  
  // Research Projects operations
  createResearchProject(project: InsertResearchProject): Promise<ResearchProject>;
  getResearchProjectsByUserId(userId: number): Promise<ResearchProject[]>;
  getResearchProject(id: number): Promise<ResearchProject | undefined>;
  updateResearchProject(id: number, updates: Partial<InsertResearchProject>): Promise<ResearchProject>;
  deleteResearchProject(id: number): Promise<void>;
  
  // Project Items operations
  addItemToProject(item: InsertProjectItem): Promise<ProjectItem>;
  getProjectItems(projectId: number): Promise<ProjectItem[]>;
  updateProjectItem(id: number, updates: Partial<InsertProjectItem>): Promise<ProjectItem>;
  removeItemFromProject(id: number): Promise<void>;
  
  // Generated Citations operations
  createGeneratedCitation(citation: InsertGeneratedCitation): Promise<GeneratedCitation>;
  getUserCitations(userId: number): Promise<GeneratedCitation[]>;
  
  // Domain Research operations
  createDomainResearch(research: InsertDomainResearch): Promise<DomainResearch>;
  getDomainResearchByUserId(userId: number): Promise<DomainResearch[]>;
  getDomainResearchByDomain(userId: number, domain: string): Promise<DomainResearch | undefined>;
  
  // Content Summaries operations
  createContentSummary(summary: InsertContentSummary): Promise<ContentSummary>;
  getUserContentSummaries(userId: number): Promise<ContentSummary[]>;
}
```

## Implementation in DatabaseStorage

Each method in the `IStorage` interface will be implemented in the `DatabaseStorage` class with appropriate SQL queries using Drizzle ORM. For example:

```typescript
// In server/storage.ts

export class DatabaseStorage implements IStorage {
  // ... existing methods ...
  
  async getUserToolPreferences(userId: number, toolId: string): Promise<UserToolPreferences | undefined> {
    const preferences = await db.query.userToolPreferences.findFirst({
      where: and(
        eq(userToolPreferences.userId, userId),
        eq(userToolPreferences.toolId, toolId)
      )
    });
    return preferences;
  }
  
  async createUserToolPreferences(prefs: InsertUserToolPreferences): Promise<UserToolPreferences> {
    const [inserted] = await db.insert(userToolPreferences).values(prefs).returning();
    return inserted;
  }
  
  async updateUserToolPreferences(userId: number, toolId: string, settings: any): Promise<UserToolPreferences> {
    const [updated] = await db
      .update(userToolPreferences)
      .set({ 
        settings, 
        lastUsed: new Date(),
        updatedAt: new Date()
      })
      .where(
        and(
          eq(userToolPreferences.userId, userId),
          eq(userToolPreferences.toolId, toolId)
        )
      )
      .returning();
    
    if (!updated) {
      // If no preferences exist yet, create them
      return this.createUserToolPreferences({
        userId,
        toolId,
        settings
      });
    }
    
    return updated;
  }
  
  // ... additional implementations for other methods ...
}
```

## Migration Strategy

1. Create a new migration script using Drizzle Kit:
   ```
   npm run drizzle:generate
   ```

2. Review the generated migration to ensure it aligns with the schema changes

3. Apply the migration:
   ```
   npm run db:push
   ```

4. Implement and test the new storage methods

## Conclusion

These schema extensions provide the necessary data structures to support the Tool Page features. The modular approach allows us to add additional tool-specific tables as needed while maintaining referential integrity through proper foreign key constraints. The storage interface extensions ensure consistent data access patterns across the application.