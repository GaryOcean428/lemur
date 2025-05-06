export interface Source {
  title: string;
  url: string;
  domain?: string;
}

export interface AIAnswer {
  answer: string;
  sources: Source[];
  model: string;
  contextual?: boolean; // Indicates if this is a contextual follow-up answer
}

export interface TraditionalResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  date?: string; // Publication date of the result
  image?: {
    url: string;
    alt?: string; // Image description for accessibility
  };
}

export interface SearchResults {
  ai: AIAnswer;
  traditional: TraditionalResult[];
  authRequired?: boolean; // Indicates if authentication is required (for limit reached scenarios)
  limitReached?: boolean; // Indicates if user has reached their search limit
  searchType?: string; // Indicates which search method was used (direct, traditional)
}
