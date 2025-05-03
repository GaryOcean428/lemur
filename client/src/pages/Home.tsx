import SearchForm from "@/components/SearchForm";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-3xl flex flex-col items-center">
        {/* Large centered logo */}
        <div className="mb-6 flex flex-col items-center">
          <div className="w-24 h-24 mb-2">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <path d="M30 40 Q 20 20 40 15 Q 45 15 45 25 L 45 35 Q 45 40 40 42 Q 25 48 30 40 Z" fill="#4B2A91" />
              <circle cx="23" cy="38" r="3" fill="#FF9BB3" />
              <path d="M75 40 Q 85 60 65 65 Q 60 65 60 55 L 60 45 Q 60 40 65 38 Q 80 32 75 40 Z" fill="#FFB6D9" />
              <path d="M40 42 Q 50 60 60 45" stroke="#4B2A91" strokeWidth="3" fill="none" />
              <circle cx="77" cy="62" r="3" fill="#4B2A91" />
              <path d="M55 55 Q 65 75 75 65" stroke="#8FDFD9" strokeWidth="9" fill="none" />
              <path d="M55 55 Q 65 75 75 65" stroke="#4B2A91" strokeWidth="3" fill="none" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-[hsl(var(--primary))] mb-2">Lemur</h1>
          <p className="text-lg text-gray-500 mb-8 text-center">
            Discover information with AI-powered insights and web results
          </p>
        </div>
        
        {/* Search form */}
        <div className="w-full max-w-2xl mx-auto mb-4">
          <SearchForm />
          <p className="text-center text-sm text-gray-500 mt-4">
            Enter a search query to get started
          </p>
        </div>
      </div>
    </div>
  );
}
