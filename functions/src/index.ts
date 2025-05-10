import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

// Initialize Firebase Admin SDK if not already initialized (typically done once)
// Ensure your service account key is available in the functions environment
// or that the functions have the correct IAM permissions.
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Resets the monthly search counts for users on "free" and "basic" tiers.
 * This function is intended to be triggered by a scheduler (e.g., Google Cloud Scheduler)
 * on the first day of each month.
 */
export const resetMonthlySearchCounts = functions.https.onRequest(async (request, response) => {
  // Secure this function, e.g., by checking a secret header if called via HTTP directly,
  // or ensure it's only callable by Cloud Scheduler with appropriate auth.
  // For simplicity, this example is open but should be secured in production.
  // A common pattern is to check `request.headers['x-scheduler-token'] === functions.config().scheduler.token`

  logger.info("Starting monthly search count reset process.", {structuredData: true});

  try {
    const usersRef = db.collection("users");
    // Query for users on tiers that have monthly limits
    const snapshot = await usersRef
      .where("tier", "in", ["free", "basic"])
      .get();

    if (snapshot.empty) {
      logger.info("No users found on 'free' or 'basic' tiers. No counts to reset.", {structuredData: true});
      response.status(200).send("No users on relevant tiers to reset.");
      return;
    }

    const batch = db.batch();
    let usersResetCount = 0;

    snapshot.forEach(doc => {
      logger.info(`Processing user ${doc.id} with tier ${doc.data().tier}`, {structuredData: true});
      const userRef = usersRef.doc(doc.id);
      batch.update(userRef, {
        searchCount: 0,
        searchCountLastResetAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      usersResetCount++;
    });

    await batch.commit();
    const successMessage = `Successfully reset search counts for ${usersResetCount} users.`;
    logger.info(successMessage, {structuredData: true});
    response.status(200).send(successMessage);

  } catch (error) {
    logger.error("Error resetting monthly search counts:", error, {structuredData: true});
    response.status(500).send("An error occurred while resetting search counts.");
  }
});

// You might also want a pub/sub triggered function for more robust scheduling:
// export const scheduledResetMonthlySearchCounts = functions.pubsub
//   .schedule("0 0 1 * *") // Runs at 00:00 on the 1st day of every month
//   .timeZone("UTC") // Specify your timezone
//   .onRun(async (context) => {
//     logger.info("Scheduled monthly search count reset triggered.", {structuredData: true});
//     // ... (copy the logic from the https.onRequest function above)
//     // Note: For pub/sub, you don't send an HTTP response.
//     // Instead, ensure the promise resolves or rejects correctly.
//     try {
//       const usersRef = db.collection("users");
//       const snapshot = await usersRef.where("tier", "in", ["free", "basic"]).get();
//       if (snapshot.empty) {
//         logger.info("No users on relevant tiers to reset.", {structuredData: true});
//         return null;
//       }
//       const batch = db.batch();
//       let usersResetCount = 0;
//       snapshot.forEach(doc => {
//         const userRef = usersRef.doc(doc.id);
//         batch.update(userRef, { 
//           searchCount: 0, 
//           searchCountLastResetAt: admin.firestore.FieldValue.serverTimestamp() 
//         });
//         usersResetCount++;
//       });
//       await batch.commit();
//       logger.info(`Successfully reset search counts for ${usersResetCount} users.`, {structuredData: true});
//       return null;
//     } catch (error) {
//       logger.error("Error in scheduled reset of search counts:", error, {structuredData: true});
//       return null; // Or throw error to indicate failure for retries
//     }
//   });
