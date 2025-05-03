import Groq from "groq-sdk";
import Tavily from "@tavily/core";
import { NextRequest, NextResponse } from "next/server";

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Initialize Tavily client
const tavily = new Tavily({
  apiKey: process.env.TAVILY_API_KEY,
});

// Define interface for Tavily search results
interface TavilySearchResult {
  title: string;
  url: string;
  content: string; // Tavily calls the description/snippet 'content'
  score: number;
  raw_content?: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Query parameter is required" }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: "Groq API key not configured" }, { status: 500 });
    }
    if (!process.env.TAVILY_API_KEY) {
      return NextResponse.json({ error: "Tavily API key not configured" }, { status: 500 });
    }

    console.log(`Received query: ${query}`);

    // --- Fetch Traditional Search Results using Tavily --- 
    let traditionalResults: TavilySearchResult[] = [];
    try {
      console.log("Fetching traditional results from Tavily...");
      // Using tavily.search which returns a list of results with title, url, content, score
      traditionalResults = await tavily.search(query, {
        searchDepth: "basic", // Use "basic" for speed, "advanced" for more thorough results
        maxResults: 5, // Fetch 5 traditional results
      });
      console.log(`Fetched ${traditionalResults.length} traditional results.`);
    } catch (tavilyError) {
      console.error("Error fetching from Tavily:", tavilyError);
      // Don't fail the whole request, just log the error and proceed without traditional results
      // Or return an error if traditional results are critical
      // return NextResponse.json({ error: "Failed to fetch traditional search results." }, { status: 500 });
    }

    // --- Generate AI Synthesized Answer using Groq --- 
    let aiResponse = "AI synthesis is currently unavailable.";
    let citations: { id: number; url: string; title: string }[] = [];

    // Prepare context for Groq from Tavily results
    const context = traditionalResults.map((result, index) => 
      `Source ${index + 1}: [${result.title}](${result.url})\n${result.content}`
    ).join("\n\n");

    try {
      console.log("Generating AI answer with Groq...");
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are a helpful search assistant. Provide a concise, synthesized answer to the user's query based *only* on the provided context below. Cite the sources using the format [Source X]. Do not use external knowledge. Context:\n\n${context}`, 
          },
          {
            role: "user",
            content: query,
          },
        ],
        // Using Compound Beta model as specified in PRD for comprehensive synthesis
        // TODO: Implement logic to choose between compound-beta and compound-beta-mini based on query complexity
        // TODO: Implement actual tool use (e.g., Tavily search) by defining tools and setting tool_choice - this might be better than manual context injection
        model: "compound-beta", // Correct model name for Compound Beta
        temperature: 0.5, // Slightly lower temp for fact-based synthesis
        max_tokens: 1024,
        top_p: 1,
        stream: false, // Set to true for streaming responses later
      });

      aiResponse = chatCompletion.choices[0]?.message?.content || "No response from AI.";
      console.log(`AI Response: ${aiResponse}`);

      // Basic citation extraction - map [Source X] back to Tavily results
      // This is a simplified approach; more robust parsing might be needed
      citations = traditionalResults.map((result, index) => ({
        id: index + 1,
        url: result.url,
        title: result.title,
      })).filter(cite => aiResponse.includes(`[Source ${cite.id}]`)); // Only include sources actually cited

    } catch (groqError) {
      console.error("Error fetching from Groq:", groqError);
      // Log error but potentially still return traditional results
      if (groqError instanceof Groq.APIError) {
        aiResponse = `Groq API Error: ${groqError.status} ${groqError.message}`;
      } else {
        aiResponse = "Error generating AI response.";
      }
    }

    // Map Tavily results to the format expected by the frontend
    const formattedTraditionalResults = traditionalResults.map(result => ({
      title: result.title,
      url: result.url,
      description: result.content, // Map Tavily 'content' to 'description'
    }));

    return NextResponse.json({
      aiAnswer: aiResponse,
      citations: citations,
      traditionalResults: formattedTraditionalResults,
    });

  } catch (error) {
    console.error("Error processing search request:", error);
    if (error instanceof Error) {
        return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
    } else {
        return NextResponse.json({ error: "An unknown error occurred" }, { status: 500 });
    }
  }
}

