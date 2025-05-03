export interface Source {
  title: string;
  url: string;
  domain?: string;
}

export interface AIAnswer {
  answer: string;
  sources: Source[];
  model: string;
}

export interface TraditionalResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  date?: string; // Publication date of the result
}

export interface SearchResults {
  ai: AIAnswer;
  traditional: TraditionalResult[];
}
