import SearchForm from "@/components/SearchForm";
import lemurLogo from "@assets/find5.png";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-3xl flex flex-col items-center">
        {/* Large centered logo */}
        <div className="mb-6 flex flex-col items-center">
          <div className="w-32 h-32 mb-2">
            <img src={lemurLogo} alt="Lemur logo" className="w-full h-full" />
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
