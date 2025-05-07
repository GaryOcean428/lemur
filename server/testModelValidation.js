/**
 * Simple test script for the model validation utility
 * 
 * This script tests whether the model validation utility correctly handles various inputs
 */

import { validateGroqModel, mapModelPreference, APPROVED_MODELS } from './utils/modelValidation.js';

// Display the approved models
console.log('APPROVED MODELS:', APPROVED_MODELS);

// Test various model inputs
const testModels = [
  "compound-beta",
  "compound-beta-mini",
  "llama-3.1-70b",
  "llama-3-8b",
  "ChatGPT-4",
  "gpt-4",
  "claude-2",
  ""
];

console.log('\nTesting validateGroqModel function:');
testModels.forEach(model => {
  try {
    const validatedModel = validateGroqModel(model);
    console.log(`Input: "${model}" → Output: "${validatedModel}"`);
  } catch (error) {
    console.error(`Input: "${model}" → Error: ${error.message}`);
  }
});

// Test model preference mapping
const testPreferences = [
  "auto",
  "fast", 
  "comprehensive",
  "maverick",
  "medium",
  "balanced",
  "quality",
  ""
];

console.log('\nTesting mapModelPreference function:');
testPreferences.forEach(pref => {
  try {
    const mappedModel = mapModelPreference(pref);
    console.log(`Preference: "${pref}" → Model: "${mappedModel}"`);
  } catch (error) {
    console.error(`Preference: "${pref}" → Error: ${error.message}`);
  }
});

console.log('\nTest complete!');