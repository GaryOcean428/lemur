/**
 * Parallel Processing Utilities
 * 
 * This module provides utilities for parallel processing of search queries
 * and other CPU-intensive tasks to improve response times.
 */

/**
 * Executes multiple promises in parallel with a concurrency limit
 * @param tasks Array of functions that return promises
 * @param concurrency Maximum number of promises to execute at once
 * @returns Array of resolved values in the same order as the input tasks
 */
export async function parallelLimit<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number = 3
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];
  
  // Initialize with empty values to maintain order
  results.length = tasks.length;
  results.fill(undefined as unknown as T);
  
  async function executeTask(task: () => Promise<T>, index: number): Promise<void> {
    try {
      const result = await task();
      results[index] = result;
    } catch (error) {
      console.error(`Error in parallel task ${index}:`, error);
      throw error; // Re-throw to be caught by the outer Promise.all
    }
  }
  
  // Process tasks with limited concurrency
  for (let i = 0; i < tasks.length; i++) {
    const taskPromise = executeTask(tasks[i], i);
    
    // Add to executing array
    executing.push(taskPromise);
    
    // If we've reached concurrency limit, wait for one task to complete
    if (executing.length >= concurrency) {
      await Promise.race(executing);
      
      // Remove completed promises
      for (let j = executing.length - 1; j >= 0; j--) {
        if (executing[j].then(() => true, () => true).catch(() => true)) {
          executing.splice(j, 1);
        }
      }
    }
  }
  
  // Wait for all remaining tasks to complete
  await Promise.all(executing);
  
  return results;
}

/**
 * Executes functions in parallel and returns results as they complete
 * @param tasks Array of functions that return promises
 * @param onResult Callback function called as each result completes
 * @param concurrency Maximum number of promises to execute at once
 * @returns Promise that resolves when all tasks are complete
 */
export async function parallelWithCallback<T>(
  tasks: (() => Promise<T>)[],
  onResult: (result: T, index: number) => void,
  concurrency: number = 3
): Promise<void> {
  const executing: Promise<void>[] = [];
  const taskQueue = [...tasks];
  
  async function runTask(task: () => Promise<T>, index: number): Promise<void> {
    try {
      const result = await task();
      onResult(result, index);
    } catch (error) {
      console.error(`Error in parallel task ${index}:`, error);
    }
  }
  
  // Helper to start a new task from the queue
  async function startNextTask(): Promise<void> {
    if (taskQueue.length === 0) return;
    
    const taskIndex = tasks.length - taskQueue.length;
    const task = taskQueue.shift()!;
    
    const promise = runTask(task, taskIndex)
      .finally(() => {
        // Remove this promise from executing array
        const index = executing.indexOf(promise);
        if (index !== -1) executing.splice(index, 1);
        
        // Start next task if any remain
        if (taskQueue.length > 0) {
          executing.push(startNextTask());
        }
      });
    
    executing.push(promise);
  }
  
  // Start initial batch of tasks up to concurrency limit
  const initialBatchSize = Math.min(concurrency, taskQueue.length);
  for (let i = 0; i < initialBatchSize; i++) {
    await startNextTask();
  }
  
  // Wait for all tasks to complete
  await Promise.all(executing);
}

/**
 * Groups related tasks for parallel execution with dependencies
 * @param taskGroups Object where keys are group names and values are arrays of tasks
 * @param dependencies Object mapping group names to arrays of dependent group names
 * @param concurrency Maximum parallel tasks per group
 * @returns Results object with the same structure as taskGroups
 */
export async function parallelTaskGroups<T>(
  taskGroups: Record<string, (() => Promise<T>)[]>,
  dependencies: Record<string, string[]> = {},
  concurrency: number = 3
): Promise<Record<string, T[]>> {
  const results: Record<string, T[]> = {};
  const completed = new Set<string>();
  
  // Helper to check if all dependencies for a group are satisfied
  function canExecuteGroup(group: string): boolean {
    const deps = dependencies[group] || [];
    return deps.every(dep => completed.has(dep));
  }
  
  // Get all groups
  const allGroups = Object.keys(taskGroups);
  
  // Process groups in order of dependencies
  while (completed.size < allGroups.length) {
    const nextGroups = allGroups.filter(group => 
      !completed.has(group) && canExecuteGroup(group)
    );
    
    if (nextGroups.length === 0) {
      throw new Error('Circular dependency detected in task groups');
    }
    
    // Execute all ready groups in parallel
    await Promise.all(nextGroups.map(async (group) => {
      results[group] = await parallelLimit(taskGroups[group], concurrency);
      completed.add(group);
    }));
  }
  
  return results;
}

/**
 * Splits a task into smaller chunks for parallel processing
 * @param items Array of items to process
 * @param processFn Function to process each chunk of items
 * @param chunkSize Number of items per chunk
 * @param concurrency Maximum number of chunks to process in parallel
 * @returns Array of results from all chunks
 */
export async function parallelChunkedProcessing<T, R>(
  items: T[],
  processFn: (chunk: T[]) => Promise<R[]>,
  chunkSize: number = 10,
  concurrency: number = 3
): Promise<R[]> {
  // Split items into chunks
  const chunks: T[][] = [];
  
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  
  // Create tasks for each chunk
  const tasks = chunks.map(chunk => () => processFn(chunk));
  
  // Process chunks in parallel with limited concurrency
  const chunkResults = await parallelLimit(tasks, concurrency);
  
  // Flatten results from all chunks
  return chunkResults.flat();
}
