# Find Search Engine - Implementation Summary

## Project Overview

This project implements a search engine called "Find" based on the provided requirements. It utilizes Groq for AI-synthesized answers and Tavily for traditional web search results, presenting them in a dual-column format.

## Technologies Used

*   **Frontend:** Next.js (v15), React (v19), Tailwind CSS
*   **Backend API:** Next.js API Routes (TypeScript)
*   **AI Synthesis:** Groq API (`groq-sdk`, using `compound-beta` model)
*   **Traditional Search:** Tavily Search API (`@tavily/core`)
*   **UI Components:** shadcn/ui (pre-installed with the `create_nextjs_app` template)
*   **Package Manager:** `pnpm` (initially used), `npm` or `yarn` recommended for local setup.

## Project Structure

*   `/home/ubuntu/find-search-engine/`
    *   `src/app/page.tsx`: The main frontend component containing the search bar, tabs, and results display logic.
    *   `src/app/api/search/route.ts`: The backend API endpoint that receives search queries, calls Tavily for web results, uses those results as context for a Groq API call (`compound-beta`), and returns both AI answers (with citations) and traditional results.
    *   `.env.local`: Contains the necessary API keys (Groq, Tavily, Supabase, GitHub, etc.). **Note:** This file contains sensitive keys and should be handled securely.
    *   `package.json`: Lists project dependencies.
    *   `tailwind.config.ts`: Tailwind CSS configuration.
    *   `next.config.mjs`: Next.js configuration.
    *   (Other standard Next.js files and folders)

## Setup and Running Locally

1.  **Prerequisites:** Node.js (v18 or later recommended), npm or yarn.
2.  **Environment Variables:** Ensure you have a `.env.local` file in the project root with the necessary API keys (GROQ_API_KEY, TAVILY_API_KEY are essential for the search functionality). The structure is provided in the attached `.env.local` file.
3.  **Install Dependencies:** Navigate to the project directory (`find-search-engine`) in your terminal and run:
    ```bash
    npm install
    # or
    yarn install
    ```
    *(Using `npm` or `yarn` is recommended due to issues encountered with `pnpm` in the sandbox environment)*.
4.  **Run Development Server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
5.  **Access:** Open your browser and navigate to `http://localhost:3000` (or the port specified by the dev server).

## Implementation Notes

*   The API route (`/api/search/route.ts`) currently uses the `compound-beta` Groq model.
*   It fetches 5 basic search results from Tavily to use as context for Groq.
*   A simple citation mechanism is implemented by checking if the AI response includes `[Source X]` and linking it back to the corresponding Tavily result.
*   Error handling is included for API key checks and API call failures.
*   The frontend (`page.tsx`) implements the UI based on the wireframe, handles user input, calls the backend API, and displays results in tabs.
*   Sponsored results and pagination are currently placeholders.

## Sandbox Environment Issues

Testing and deployment within the sandbox environment were unsuccessful due to persistent, low-level system errors (`Bus error`, `Input/output error`) affecting package managers (`pnpm`, `apt`) and basic commands (`zip`). The provided code represents the completed implementation up to the point where testing was blocked.
