/**
 * Firestore Security Rules Testing Suite
 * 
 * Uses the Firebase Testing Framework to validate security rules
 * against various user scenarios in an isolated local environment.
 */
const firebase = require('@firebase/rules-unit-testing');
const fs = require('fs');
const path = require('path');

/**
 * Test environment configuration
 */
const projectId = "lemur-rules-test";
let testEnv;

/**
 * Helper to read the rules file
 */
const loadRules = () => {
  const rulesPath = path.resolve(__dirname, '../firestore.rules');
  return fs.readFileSync(rulesPath, 'utf8');
};

/**
 * Setup and teardown for each test
 */
beforeAll(async () => {
  testEnv = await firebase.initializeTestEnvironment({
    projectId,
    firestore: {
      rules: loadRules(),
    }
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

/**
 * Helper for authenticated context
 */
const getAuthedFirestore = (auth) => {
  return testEnv.authenticatedContext(auth.uid, {
    email: auth.email,
    role: auth.role || 'user'
  }).firestore();
};

/**
 * Helper for unauthenticated context
 */
const getUnauthFirestore = () => {
  return testEnv.unauthenticatedContext().firestore();
};

/**
 * Tests: User Document Access Control
 */
describe('User profile security rules', () => {
  const userProfile = {
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  test('Users can read their own profile', async () => {
    const userId = 'user123';
    const authenticatedDb = getAuthedFirestore({ uid: userId, email: 'test@example.com' });
    
    // Set up user document
    const userDocRef = authenticatedDb
      .collection('users')
      .doc(userId);
    await firebase.withSecurityRulesDisabled(async (context) => {
      await context.firestore()
        .collection('users')
        .doc(userId)
        .set(userProfile);
    });
    
    // Verify read access
    await firebase.assertSucceeds(userDocRef.get());
  });
  
  test('Users cannot read other user profiles', async () => {
    const targetUserId = 'user123';
    const otherUserId = 'user456';
    
    // Set up target document
    await firebase.withSecurityRulesDisabled(async (context) => {
      await context.firestore()
        .collection('users')
        .doc(targetUserId)
        .set(userProfile);
    });
    
    // Try to read as another user
    const authenticatedDb = getAuthedFirestore({ uid: otherUserId, email: 'other@example.com' });
    const targetUserDoc = authenticatedDb
      .collection('users')
      .doc(targetUserId);
    
    await firebase.assertFails(targetUserDoc.get());
  });
  
  test('Admins can read any user profile', async () => {
    const targetUserId = 'user123';
    const adminUserId = 'admin456';
    
    // Set up target document
    await firebase.withSecurityRulesDisabled(async (context) => {
      await context.firestore()
        .collection('users')
        .doc(targetUserId)
        .set(userProfile);
    });
    
    // Try to read as admin
    const authenticatedDb = getAuthedFirestore({ 
      uid: adminUserId, 
      email: 'admin@example.com',
      role: 'admin'
    });
    
    const targetUserDoc = authenticatedDb
      .collection('users')
      .doc(targetUserId);
    
    await firebase.assertSucceeds(targetUserDoc.get());
  });
});

/**
 * Tests: Public content access
 */
describe('Public content security rules', () => {
  const publicContent = {
    title: 'Public Document',
    content: 'This is publicly accessible',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  test('Anyone can read public content', async () => {
    // Set up public document
    await firebase.withSecurityRulesDisabled(async (context) => {
      await context.firestore()
        .collection('public')
        .doc('doc1')
        .set(publicContent);
    });
    
    // Unauthenticated access should succeed
    const unauthDb = getUnauthFirestore();
    const publicDoc = unauthDb
      .collection('public')
      .doc('doc1');
    
    await firebase.assertSucceeds(publicDoc.get());
  });
});
