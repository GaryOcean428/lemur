import SearchForm from "@/components/SearchForm";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-16">
      <div className="mx-auto max-w-3xl text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 find-logo">
          Discover More With Find
        </h1>
        <p className="text-lg text-[hsl(var(--neutral-muted))] mb-8">
          AI-powered search engine for comprehensive answers and accurate results
        </p>
      </div>

      <div className="max-w-3xl mx-auto mb-8">
        <SearchForm />
      </div>

      {/* Features Section */}
      <div className="mt-20 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-10">Powered by Advanced AI Technology</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center bg-[hsl(var(--primary-light))] bg-opacity-10 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-primary">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.3-4.3"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Fast, Accurate Results</h3>
            <p className="text-[hsl(var(--neutral-muted))]">Get comprehensive search results from across the web in seconds.</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center bg-[hsl(var(--primary-light))] bg-opacity-10 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-primary">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <path d="M12 17h.01"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">AI-Powered Answers</h3>
            <p className="text-[hsl(var(--neutral-muted))]">Direct responses synthesized from multiple reliable sources.</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center bg-[hsl(var(--primary-light))] bg-opacity-10 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-primary">
                <path d="M20 5H9l-7 7 7 7h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z"/>
                <line x1="18" y1="9" x2="12" y2="15"/>
                <line x1="12" y1="9" x2="18" y2="15"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Transparent Citations</h3>
            <p className="text-[hsl(var(--neutral-muted))]">Clear references to all sources so you can verify information.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
