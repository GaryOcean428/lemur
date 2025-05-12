/**
 * Firebase Development Data Seeder
 * 
 * Populates Firebase emulators with test data for local development
 * Chain of Draft approach: Connect → Generate → Seed → Validate
 */
import { initializeApp } from 'firebase-admin/app';
import { getAuth, UserRecord } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

// Initialize environment variables
dotenv.config();

// Connect to emulators
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
process.env.FIREBASE_STORAGE_EMULATOR_HOST = 'localhost:9199';

// Initialize Firebase Admin
initializeApp({
  projectId: 'lemur-dev'
});

// Service references
const auth = getAuth();
const db = getFirestore();

/**
 * Data Types
 */
interface UserData {
  uid?: string;
  email: string;
  password: string;
  displayName: string;
  role: 'user' | 'admin' | 'moderator';
  searchPreferences?: {
    defaultEngine?: string;
    resultsPerPage?: number;
  };
}

interface PublicDocument {
  title: string;
  content: string;
  status: 'draft' | 'published';
  author: string;
  tags?: string[];
}

/**
 * Test Users
 */
const users: UserData[] = [
  {
    email: 'admin@example.com',
    password: 'adminPassword123!',
    displayName: 'Admin User',
    role: 'admin'
  },
  {
    email: 'user1@example.com',
    password: 'userPassword123!',
    displayName: 'Regular User',
    role: 'user',
    searchPreferences: {
      defaultEngine: 'google',
      resultsPerPage: 10
    }
  },
  {
    email: 'moderator@example.com',
    password: 'modPassword123!',
    displayName: 'Content Moderator',
    role: 'moderator'
  }
];

/**
 * Public content
 */
const publicDocuments: PublicDocument[] = [
  {
    title: 'Welcome to Lemur',
    content: 'Lemur is your intelligent search companion...',
    status: 'published',
    author: 'admin',
    tags: ['welcome', 'introduction']
  },
  {
    title: 'Search Tips & Tricks',
    content: 'Learn how to get the most from your searches...',
    status: 'published',
    author: 'admin',
    tags: ['help', 'tips']
  },
  {
    title: 'Upcoming Features',
    content: 'Check out our roadmap for upcoming features...',
    status: 'draft',
    author: 'moderator',
    tags: ['roadmap', 'features']
  }
];

/**
 * Create a user and their profile document
 */
async function createUser(userData: UserData): Promise<UserRecord> {
  try {
    // Create the auth user
    const userRecord = await auth.createUser({
      email: userData.email,
      password: userData.password,
      displayName: userData.displayName
    });
    
    console.log(`Created user: ${userRecord.uid} (${userData.email})`);
    
    // Create the user profile document
    await db.collection('users').doc(userRecord.uid).set({
      email: userData.email,
      displayName: userData.displayName,
      role: userData.role,
      createdAt: Timestamp.now(),
      searchPreferences: userData.searchPreferences || {},
      settings: {
        theme: 'light',
        notifications: true
      }
    });
    
    console.log(`Created profile for: ${userRecord.uid}`);
    
    return userRecord;
  } catch (error) {
    console.error(`Error creating user ${userData.email}:`, error);
    throw error;
  }
}

/**
 * Create public documents
 */
async function createPublicDocuments(documents: PublicDocument[]): Promise<void> {
  const batch = db.batch();
  
  documents.forEach((doc, index) => {
    const docRef = db.collection('public').doc(`doc-${index + 1}`);
    batch.set(docRef, {
      ...doc,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      viewCount: 0
    });
  });
  
  await batch.commit();
  console.log(`Created ${documents.length} public documents`);
}

/**
 * Create sample search history for user
 */
async function createSearchHistory(userId: string): Promise<void> {
  const searches = [
    'firebase best practices',
    'react state management',
    'typescript interfaces vs types',
    'serverless functions performance',
    'firestore security rules'
  ];
  
  const batch = db.batch();
  
  searches.forEach((query, index) => {
    const docRef = db.collection('searchHistory').doc(`${userId}-search-${index + 1}`);
    batch.set(docRef, {
      userId,
      query,
      timestamp: Timestamp.fromDate(new Date(Date.now() - (index * 86400000))), // Each a day apart
      resultCount: Math.floor(Math.random() * 100) + 10
    });
  });
  
  await batch.commit();
  console.log(`Created ${searches.length} search history records for user ${userId}`);
}

/**
 * Main seed function
 */
async function seedData(): Promise<void> {
  try {
    console.log('🌱 Starting seeding of development data...');
    
    // Create users and profiles
    const createdUsers: UserRecord[] = [];
    for (const userData of users) {
      const userRecord = await createUser(userData);
      createdUsers.push(userRecord);
    }
    
    // Create public documents
    await createPublicDocuments(publicDocuments);
    
    // Create search history for regular user
    const regularUser = createdUsers.find(user => 
      user.email === 'user1@example.com'
    );
    
    if (regularUser) {
      await createSearchHistory(regularUser.uid);
    }
    
    console.log('✅ Data seeding complete');
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

// Execute seed function
seedData()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error during seeding:', err);
    process.exit(1);
  });
