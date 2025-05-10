// server/services/orchestratorService.ts

import {
  AgentCapabilityDeclaration,
  TaskDefinition,
  TaskResult,
  TaskStatusUpdate,
  WebSearchInput,
  WebSearchOutput,
  SummarizeTextInput,
  SummarizeTextOutput,
  DeepResearchProject, // Added from agentProtocols
} from "../types/agentProtocols";
import {
  // registerAgent as registerAgentInRegistry, // Not used directly here anymore for project creation
  getAgentDeclaration,
  findAgentsByTaskType,
  // listAllAgents // Not used directly here anymore for project creation
} from "./agentRegistryService";
import { v4 as uuidv4 } from "uuid";
import { db, FieldValue } from "../firebaseAdmin"; // Import Firestore database instance and FieldValue

const PROJECTS_COLLECTION = "deepResearchProjects";
const TASKS_SUBCOLLECTION = "tasks"; // Subcollection under each project for its tasks
const RESULTS_SUBCOLLECTION = "results"; // Subcollection under each project for its results (or store with tasks)

/**
 * Initiates a new deep research project in Firestore.
 * @param userId - The ID of the user initiating the research.
 * @param query - The user's original research query.
 * @returns The newly created project object.
 */
export const createResearchProject = async (userId: string, query: string): Promise<DeepResearchProject> => {
  const projectId = uuidv4();
  const now = new Date().toISOString();
  const project: DeepResearchProject = {
    projectId,
    userId,
    originalQuery: query,
    status: "pending",
    // tasks: [], // Tasks will be a subcollection
    // results: [], // Results will be a subcollection or part of tasks
    createdAt: now,
    updatedAt: now,
    tier: "pro", // Example: Assuming pro tier for deep research, this should be dynamic
  };

  try {
    await db.collection(PROJECTS_COLLECTION).doc(projectId).set(project);
    console.log(`New research project created in Firestore: ${projectId} for query: "${query}"`);
    return project;
  } catch (error) {
    console.error(`Error creating research project ${projectId} in Firestore:`, error);
    throw error;
  }
};

/**
 * Retrieves a research project by its ID from Firestore.
 * @param projectId - The ID of the project.
 * @returns The project object or undefined if not found.
 */
export const getResearchProject = async (projectId: string): Promise<DeepResearchProject | undefined> => {
  try {
    const projectDoc = await db.collection(PROJECTS_COLLECTION).doc(projectId).get();
    if (!projectDoc.exists) {
      console.log(`Project with ID ${projectId} not found in Firestore.`);
      return undefined;
    }
    return projectDoc.data() as DeepResearchProject;
  } catch (error) {
    console.error(`Error retrieving project ${projectId} from Firestore:`, error);
    throw error;
  }
};

/**
 * Adds a task to a research project in Firestore and (conceptually) dispatches it.
 * @param projectId - The ID of the project.
 * @param taskInput - The input data for the task.
 * @param taskType - The type of task (e.g., "web_search", "summarize_text").
 * @param taskConfig - Optional configuration for the task, like priority.
 * @returns The created TaskDefinition.
 */
export const addTaskToProject = async (
  projectId: string,
  taskInput: any,
  taskType: string,
  taskConfig?: Partial<Omit<TaskDefinition, 'taskId' | 'parentResearchId' | 'inputData' | 'taskType' | 'createdAt' | 'status'>>
): Promise<TaskDefinition | null> => {
  const projectRef = db.collection(PROJECTS_COLLECTION).doc(projectId);
  try {
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists) {
      console.error(`Project not found: ${projectId}`);
      return null;
    }

    const suitableAgents = await findAgentsByTaskType(taskType);
    if (suitableAgents.length === 0) {
      console.error(`No agents found for task type: ${taskType}`);
      // TODO: Implement fallback agent logic or error reporting as per design
      return null;
    }
    const selectedAgent = suitableAgents[0]; // Basic selection, enhance with load balancing/priority

    const taskId = uuidv4();
    const now = new Date().toISOString();
    const task: TaskDefinition = {
      taskId,
      parentResearchId: projectId,
      taskType,
      assignedToAgentId: selectedAgent.agentId,
      assignedToAgentType: selectedAgent.agentType,
      priority: taskConfig?.priority || 1,
      inputData: taskInput,
      status: "pending",
      createdAt: now,
      updatedAt: now,
      statusCallbackUrl: taskConfig?.statusCallbackUrl || `/api/orchestrator/task/${taskId}/status`, // Example
      resultWebhookUrl: taskConfig?.resultWebhookUrl || `/api/orchestrator/task/${taskId}/result`,   // Example
      retries: 0,
      maxRetries: taskConfig?.maxRetries || 3,
      timeoutSeconds: taskConfig?.timeoutSeconds || 300,
      outputData: null, // Initialize outputData as null
      errorDetails: null, // Initialize errorDetails as null
    };

    await projectRef.collection(TASKS_SUBCOLLECTION).doc(taskId).set(task);
    await projectRef.update({
      status: "in_progress",
      updatedAt: now,
    });

    console.log(`Task ${task.taskId} (${taskType}) added to project ${projectId} in Firestore and assigned to agent ${selectedAgent.agentId}`);
    
    // Conceptual dispatch - actual dispatch logic will be separate
    // dispatchTask(task, selectedAgent);

    return task;
  } catch (error) {
    console.error(`Error adding task to project ${projectId} in Firestore:`, error);
    throw error;
  }
};


/**
 * Updates a task's status and optionally its output or error details in Firestore.
 * @param projectId The ID of the parent project.
 * @param taskId The ID of the task to update.
 * @param updates Partial TaskDefinition containing updates (e.g., status, outputData, errorDetails).
 */
export const updateTaskInProject = async (
    projectId: string,
    taskId: string,
    updates: Partial<TaskDefinition>
): Promise<void> => {
    const taskRef = db.collection(PROJECTS_COLLECTION).doc(projectId)
                      .collection(TASKS_SUBCOLLECTION).doc(taskId);
    const projectRef = db.collection(PROJECTS_COLLECTION).doc(projectId);
    const now = new Date().toISOString();

    try {
        await db.runTransaction(async (transaction) => {
            const taskDoc = await transaction.get(taskRef);
            if (!taskDoc.exists) {
                throw new Error(`Task ${taskId} not found in project ${projectId}`);
            }

            const taskUpdateData = { ...updates, updatedAt: now };
            transaction.update(taskRef, taskUpdateData);
            transaction.update(projectRef, { updatedAt: now }); // Also update project's updatedAt
        });
        console.log(`Task ${taskId} in project ${projectId} updated in Firestore.`);
    } catch (error) {
        console.error(`Error updating task ${taskId} in project ${projectId}:`, error);
        throw error;
    }
};


/**
 * Handles a task result update from an agent.
 * Stores the result and updates the task and project status in Firestore.
 * @param projectId - The ID of the project.
 * @param result - The TaskResult object from the agent.
 */
export const handleTaskResult = async (projectId: string, result: TaskResult): Promise<void> => {
  const projectRef = db.collection(PROJECTS_COLLECTION).doc(projectId);
  const taskRef = projectRef.collection(TASKS_SUBCOLLECTION).doc(result.taskId);
  const now = new Date().toISOString();

  try {
    await db.runTransaction(async (transaction) => {
      const projectDoc = await transaction.get(projectRef);
      const taskDoc = await transaction.get(taskRef);

      if (!projectDoc.exists) {
        throw new Error(`Project ${projectId} not found when handling result for task: ${result.taskId}`);
      }
      if (!taskDoc.exists) {
        throw new Error(`Task ${result.taskId} not found in project ${projectId} when handling result.`);
      }

      // Update task with result data
      const taskUpdateData: Partial<TaskDefinition> = {
        status: result.status,
        outputData: result.outputData,
        errorDetails: result.errorDetails,
        updatedAt: now,
      };
      transaction.update(taskRef, taskUpdateData);

      // Update project's general updatedAt timestamp
      transaction.update(projectRef, { updatedAt: now });

      // Check if all tasks are completed to finalize the project
      // This requires fetching all tasks for the project within the transaction if possible, or a subsequent check.
    });
    console.log(`Result for task ${result.taskId} (project ${projectId}) processed and task updated.`);

    // Post-transaction: Check project completion status
    await checkAndFinalizeProjectCompletion(projectId);

  } catch (error) {
    console.error(`Error handling task result for ${result.taskId} in project ${projectId}:`, error);
    throw error;
  }
};

/**
 * Checks if all tasks in a project are completed and updates the project status.
 * @param projectId The ID of the project.
 */
export const checkAndFinalizeProjectCompletion = async (projectId: string): Promise<void> => {
    const projectRef = db.collection(PROJECTS_COLLECTION).doc(projectId);
    const tasksSnapshot = await projectRef.collection(TASKS_SUBCOLLECTION).get();
    const now = new Date().toISOString();

    let allTasksCompleted = true;
    let hasFailures = false;
    if (tasksSnapshot.empty) {
        allTasksCompleted = false; // No tasks, so not completed in a meaningful way for deep research
    }

    tasksSnapshot.forEach(taskDoc => {
        const task = taskDoc.data() as TaskDefinition;
        if (task.status !== "completed" && task.status !== "failed_terminal") { // Assuming 'failed_terminal' for non-retryable fails
            allTasksCompleted = false;
        }
        if (task.status === "failed" || task.status === "failed_terminal") {
            hasFailures = true;
        }
    });

    if (allTasksCompleted) {
        const finalStatus = hasFailures ? "completed_with_errors" : "completed";
        try {
            // TODO: Implement final report generation/aggregation logic here
            // For now, just update status and a placeholder report.
            const aggregatedResults = [];
            tasksSnapshot.forEach(doc => {
                const task = doc.data() as TaskDefinition;
                if(task.outputData) aggregatedResults.push({taskId: task.taskId, output: task.outputData, status: task.status});
            });

            await projectRef.update({
                status: finalStatus,
                updatedAt: now,
                finalReport: { 
                    summary: `Project ${finalStatus}. Final report to be generated.`, 
                    aggregatedResults 
                }
            });
            console.log(`Project ${projectId} status updated to ${finalStatus}.`);
        } catch (updateError) {
            console.error(`Error updating project ${projectId} to ${finalStatus}:`, updateError);
        }
    }
};


/**
 * Handles a task status update from an agent (e.g., 'in_progress', 'retrying').
 * @param projectId - The ID of the project.
 * @param statusUpdate - The TaskStatusUpdate object from the agent.
 */
export const handleTaskStatusUpdate = async (projectId: string, statusUpdate: TaskStatusUpdate): Promise<void> => {
  const taskRef = db.collection(PROJECTS_COLLECTION).doc(projectId)
                    .collection(TASKS_SUBCOLLECTION).doc(statusUpdate.taskId);
  const projectRef = db.collection(PROJECTS_COLLECTION).doc(projectId);
  const now = new Date().toISOString();

  try {
    await db.runTransaction(async (transaction) => {
        const taskDoc = await transaction.get(taskRef);
        if (!taskDoc.exists) {
            throw new Error(`Task ${statusUpdate.taskId} not found in project ${projectId} for status update.`);
        }
        transaction.update(taskRef, { 
            status: statusUpdate.status, 
            message: statusUpdate.message || FieldValue.delete(), // Remove message if not provided
            progressPercentage: statusUpdate.progressPercentage || FieldValue.delete(),
            updatedAt: now 
        });
        transaction.update(projectRef, { updatedAt: now });
    });
    console.log(`Status update for task ${statusUpdate.taskId} in project ${projectId}: ${statusUpdate.status}`);
  } catch (error) {
    console.error(`Error handling task status update for ${statusUpdate.taskId} in project ${projectId}:`, error);
    // Decide if this should throw or just log
  }
};

/**
 * Retrieves all tasks for a given project.
 * @param projectId The ID of the project.
 * @returns An array of TaskDefinition objects.
 */
export const getProjectTasks = async (projectId: string): Promise<TaskDefinition[]> => {
    const tasks: TaskDefinition[] = [];
    try {
        const snapshot = await db.collection(PROJECTS_COLLECTION).doc(projectId)
                                 .collection(TASKS_SUBCOLLECTION).orderBy("createdAt").get();
        snapshot.forEach(doc => {
            tasks.push(doc.data() as TaskDefinition);
        });
    } catch (error) {
        console.error(`Error retrieving tasks for project ${projectId}:`, error);
        throw error;
    }
    return tasks;
};

// TODO: Implement actual task dispatching logic (e.g., to an internal agent handler or external HTTP endpoint)
// TODO: Implement model fallback logic within agent selection or task execution
// TODO: Implement retry strategies for tasks (e.g., based on task.retries and task.maxRetries)

