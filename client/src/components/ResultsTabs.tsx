interface ResultsTabsProps {
  activeTab: string;
  onTabChange: (tab: "ai" | "traditional" | "all") => void;
}

export default function ResultsTabs({ activeTab, onTabChange }: ResultsTabsProps) {
  return (
    <div className="border-b border-gray-200">
      <nav className="flex -mb-px">
        <button 
          className={`mr-1 py-2 px-4 border-b-2 ${activeTab === "ai" ? "tab-active" : "tab-inactive"}`}
          onClick={() => onTabChange("ai")}
          aria-selected={activeTab === "ai"}
        >
          AI Answer
        </button>
        <button 
          className={`mr-1 py-2 px-4 border-b-2 ${activeTab === "traditional" ? "tab-active" : "tab-inactive"}`}
          onClick={() => onTabChange("traditional")}
          aria-selected={activeTab === "traditional"}
        >
          Web Results
        </button>
        <button 
          className={`mr-1 py-2 px-4 border-b-2 ${activeTab === "all" ? "tab-active" : "tab-inactive"}`}
          onClick={() => onTabChange("all")}
          aria-selected={activeTab === "all"}
        >
          All Results
        </button>
      </nav>
    </div>
  );
}
