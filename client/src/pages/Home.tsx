import SearchForm from "@/components/SearchForm";
import lemurLogo from "../assets/images/find5.png";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-3xl flex flex-col items-center">
        {/* Large centered logo with glow effect */}
        <div className="mb-6 flex flex-col items-center">
          <div className="w-32 h-32 mb-2 relative group">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-md group-hover:blur-xl opacity-70 group-hover:opacity-100 transition-all duration-300 -z-10 dark:bg-primary/30"></div>
            <img src={lemurLogo} alt="Lemur logo" className="w-full h-full" />
          </div>
          <h1 className="text-4xl font-bold text-[hsl(var(--primary))] mb-2 glow-text dark:text-white/90">Lemur</h1>
          <p className="text-lg text-[hsl(var(--neutral-muted))] mb-8 text-center max-w-md dark:text-gray-300">
            Discover information with AI-powered insights and web results
          </p>
        </div>
        
        {/* Search form with subtle card effect */}
        <div className="w-full max-w-2xl mx-auto mb-4 relative">
          <div className="absolute inset-0 bg-secondary/5 dark:bg-secondary/10 rounded-2xl blur-xl -z-10"></div>
          <SearchForm />
          <p className="text-center text-sm text-[hsl(var(--neutral-muted))] mt-4 dark:text-gray-400">
            Enter a search query to get started
          </p>
        </div>
        
        {/* Feature highlights */}
        <div className="mt-12 w-full grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card-glass p-4 card-hover">
            <div className="text-primary font-bold mb-2 dark:text-primary-light">AI-Powered Answers</div>
            <p className="text-sm dark:text-gray-400">Get comprehensive answers synthesized from multiple sources</p>
          </div>
          <div className="card-glass p-4 card-hover">
            <div className="text-primary font-bold mb-2 dark:text-primary-light">Reliable Citations</div>
            <p className="text-sm dark:text-gray-400">Every answer includes citations to original sources</p>
          </div>
          <div className="card-glass p-4 card-hover">
            <div className="text-primary font-bold mb-2 dark:text-primary-light">Traditional Results</div>
            <p className="text-sm dark:text-gray-400">Browse traditional web results alongside AI insights</p>
          </div>
        </div>
      </div>
    </div>
  );
}
