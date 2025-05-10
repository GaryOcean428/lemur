// server/routes/orchestratorRoutes.ts
import express, { type Request, Response } from "express";
import {
  createResearchProject,
  getResearchProject,
  addTaskToProject,
  handleTaskResult,
  handleTaskStatusUpdate
} from "../services/orchestratorService";
import { auth } from "../firebaseAdmin"; // Import Firebase auth directly

const router = express.Router();

// Firebase Authentication middleware
const authenticateFirebaseToken = async (req: Request, res: Response, next: Function) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).send({ message: "Unauthorized: No token provided" });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    (req as any).user = decodedToken; // Add Firebase user to request object
    console.log(`User authenticated: ${decodedToken.uid}`);
    next();
  } catch (error: any) {
    console.error(`Error verifying Firebase ID token: ${error.message || String(error)}`);
    return res.status(403).send({ message: "Forbidden: Invalid or expired token." });
  }
};

// Create a new research project
router.post("/projects", authenticateFirebaseToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.uid; // Assumes user is populated by authenticateFirebaseToken
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ message: "Query is required to start a research project." });
    }
    const project = await createResearchProject(userId, query);
    res.status(201).json(project);
  } catch (error: any) {
    console.error("Error creating research project:", error);
    res.status(500).json({ message: "Failed to create research project", error: error.message });
  }
});

// Get a research project by ID
router.get("/projects/:projectId", authenticateFirebaseToken, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const project = await getResearchProject(projectId);
    if (!project) {
      return res.status(404).json({ message: "Research project not found." });
    }
    // Optional: Add check if (req as any).user.uid === project.userId for ownership
    res.status(200).json(project);
  } catch (error: any) {
    console.error("Error retrieving research project:", error);
    res.status(500).json({ message: "Failed to retrieve research project", error: error.message });
  }
});

// Add a task to a research project
router.post("/projects/:projectId/tasks", authenticateFirebaseToken, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { taskType, inputData } = req.body;

    if (!taskType || !inputData) {
      return res.status(400).json({ message: "taskType and inputData are required." });
    }

    const task = await addTaskToProject(projectId, inputData, taskType);
    if (!task) {
      return res.status(500).json({ message: "Failed to add task to project. Agent for task type might not be available or project not found." });
    }
    res.status(201).json(task);
  } catch (error: any) {
    console.error("Error adding task to project:", error);
    res.status(500).json({ message: "Failed to add task to project", error: error.message });
  }
});

// Endpoint for agents to post task status updates
// This endpoint would typically not be authenticated by user token, 
// but rather by a pre-shared secret or API key if agents are external.
// For simplicity, keeping it open or using a different auth mechanism later.
router.post("/task/:projectId/status", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const statusUpdate = req.body; // Expects TaskStatusUpdate structure
    if (!statusUpdate || !statusUpdate.taskId) {
        return res.status(400).json({ message: "Invalid task status update payload." });
    }
    await handleTaskStatusUpdate(projectId, statusUpdate);
    res.status(200).json({ message: "Status update received." });
  } catch (error: any) {
    console.error("Error handling task status update:", error);
    res.status(500).json({ message: "Failed to handle task status update", error: error.message });
  }
});

// Endpoint for agents to post task results
// Similar auth considerations as the status update endpoint.
router.post("/task/:projectId/result", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const taskResult = req.body; // Expects TaskResult structure
    if (!taskResult || !taskResult.taskId) {
        return res.status(400).json({ message: "Invalid task result payload." });
    }
    await handleTaskResult(projectId, taskResult);
    res.status(200).json({ message: "Result received." });
  } catch (error: any) {
    console.error("Error handling task result:", error);
    res.status(500).json({ message: "Failed to handle task result", error: error.message });
  }
});

export default router;

