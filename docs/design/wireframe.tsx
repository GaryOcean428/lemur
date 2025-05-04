import React, { useState } from 'react';
import { Search, Mic, Camera, Moon, ArrowRight, ExternalLink, Bookmark, ThumbsUp, ThumbsDown } from 'lucide-react';

const SearchResult = ({ title, url, description }) => (
  <div className="mb-4">
    <div className="text-xs text-gray-500 mb-1">{url}</div>
    <a href="#" className="text-blue-600 hover:underline text-lg font-medium block mb-1">{title}</a>
    <p className="text-sm text-gray-700">{description}</p>
  </div>
);

const SponsoredResult = ({ title, url, description }) => (
  <div className="mb-4 border-l-4 border-yellow-400 pl-3">
    <div className="flex items-center mb-1">
      <span className="text-xs text-gray-500">{url}</span>
      <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">Sponsored</span>
    </div>
    <a href="#" className="text-blue-600 hover:underline text-lg font-medium block mb-1">{title}</a>
    <p className="text-sm text-gray-700">{description}</p>
  </div>
);

const FindWireframe = () => {
  const [activeTab, setActiveTab] = useState('all');
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600 mr-4">Find</h1>
              <div className="relative flex-1 max-w-2xl">
                <div className="flex items-center bg-white border rounded-full px-4 py-2 shadow-sm">
                  <Search className="h-5 w-5 text-gray-400 mr-2" />
                  <input
                    type="text"
                    defaultValue="renewable energy developments"
                    className="flex-1 outline-none bg-transparent"
                    placeholder="Search..."
                  />
                  <div className="flex items-center space-x-2">
                    <button className="p-1 rounded-full hover:bg-gray-100">
                      <Mic className="h-5 w-5 text-blue-500" />
                    </button>
                    <button className="p-1 rounded-full hover:bg-gray-100">
                      <Camera className="h-5 w-5 text-blue-500" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 rounded-full hover:bg-gray-100">
                <Moon className="h-5 w-5 text-gray-600" />
              </button>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                Sign In
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex border-b mb-6">
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'all' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'
            }`}
            onClick={() => setActiveTab('all')}
          >
            All
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'ai' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'
            }`}
            onClick={() => setActiveTab('ai')}
          >
            AI Answer
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'web' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'
            }`}
            onClick={() => setActiveTab('web')}
          >
            Web Results
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'news' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'
            }`}
            onClick={() => setActiveTab('news')}
          >
            News
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'images' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'
            }`}
            onClick={() => setActiveTab('images')}
          >
            Images
          </button>
        </div>

        {/* Content */}
        <div className="flex gap-6">
          {/* AI Answer Box */}
          <div className="w-1/2 bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-gray-800">AI Answer</h2>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Groq Compound Beta</span>
            </div>
            
            <div className="prose max-w-none">
              <p className="text-gray-700 mb-3">
                Recent developments in renewable energy have focused on improving efficiency and reducing costs. Solar panel efficiency has increased to over 23% for commercial panels, with new perovskite-silicon tandem cells achieving up to 29.8% efficiency in laboratory settings<sup>1</sup>.
              </p>
              
              <p className="text-gray-700 mb-3">
                Wind energy has seen significant growth with offshore installations increasing by 37% globally in 2024<sup>2</sup>. Floating offshore wind platforms are expanding deployment options to deeper waters, with several major projects now operational<sup>3</sup>.
              </p>
              
              <p className="text-gray-700 mb-3">
                Battery storage technologies have also advanced, with lithium-ion battery costs declining by approximately 89% since 2010<sup>4</sup>. Grid-scale storage deployments have increased dramatically, supporting higher integration of variable renewable sources<sup>5</sup>.
              </p>
              
              <p className="text-gray-700 mb-3">
                Green hydrogen production through electrolysis powered by renewable energy is scaling up, with electrolyzer costs projected to fall 40-80% by 2030 as manufacturing scales<sup>6</sup>.
              </p>
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Sources:</h3>
              <div className="space-y-1 text-xs text-gray-600">
                <div><sup>1</sup> <a href="#" className="text-blue-600 hover:underline">National Renewable Energy Laboratory (NREL) - Solar Efficiency Records (2025)</a></div>
                <div><sup>2</sup> <a href="#" className="text-blue-600 hover:underline">Global Wind Energy Council - Annual Wind Report (2025)</a></div>
                <div><sup>3</sup> <a href="#" className="text-blue-600 hover:underline">International Energy Agency - Offshore Wind Outlook (2025)</a></div>
                <div><sup>4</sup> <a href="#" className="text-blue-600 hover:underline">BloombergNEF - Battery Price Survey (2024)</a></div>
                <div><sup>5</sup> <a href="#" className="text-blue-600 hover:underline">U.S. Department of Energy - Grid Energy Storage Report (2025)</a></div>
                <div><sup>6</sup> <a href="#" className="text-blue-600 hover:underline">Hydrogen Council - Hydrogen Insights (2025)</a></div>
              </div>
            </div>
            
            <div className="mt-4 flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <button className="flex items-center text-sm text-gray-600 hover:text-blue-600">
                  <ThumbsUp className="h-4 w-4 mr-1" /> Helpful
                </button>
                <button className="flex items-center text-sm text-gray-600 hover:text-blue-600">
                  <ThumbsDown className="h-4 w-4 mr-1" /> Not helpful
                </button>
              </div>
              <div className="flex items-center space-x-3">
                <button className="flex items-center text-sm text-gray-600 hover:text-blue-600">
                  <Bookmark className="h-4 w-4 mr-1" /> Save
                </button>
                <button className="flex items-center text-sm text-blue-600 hover:text-blue-800">
                  Follow up <ArrowRight className="h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Web Results */}
          <div className="w-1/2">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Web Results</h2>
            
            <SponsoredResult 
              title="Renewable Energy Solutions for Your Home - Special Offer"
              url="www.greenpower-solutions.com/special-offer"
              description="Upgrade to solar power with our special 2025 tax rebate offer. Save up to 30% on installation and reduce your energy bill by up to 80%. Free consultation available."
            />
            
            <SearchResult 
              title="Latest Renewable Energy Trends & Developments | IEA"
              url="www.iea.org/reports/renewable-energy-outlook-2025"
              description="Comprehensive analysis of current renewable energy technologies, market trends, and future projections. Includes data on solar, wind, hydro, and emerging technologies."
            />
            
            <SearchResult 
              title="Breakthrough in Solar Cell Efficiency Reaches 30% | Science Daily"
              url="www.sciencedaily.com/releases/2025/02/250215092300.htm"
              description="Researchers have achieved a record-breaking 29.8% efficiency in perovskite-silicon tandem solar cells, approaching the theoretical limit. This development could significantly reduce costs."
            />
            
            <SearchResult 
              title="Global Wind Report 2025 | Global Wind Energy Council"
              url="www.gwec.net/global-wind-report-2025"
              description="Annual market update on the global wind industry. Offshore wind deployments increased 37% with several floating wind platforms now commercially operational."
            />
            
            <SearchResult 
              title="Battery Storage Revolution: Grid-Scale Deployments Soar"
              url="www.energy-storage-news.com/analysis/battery-revolution-2025"
              description="Analysis of the rapidly growing energy storage market. Lithium-ion costs continue to fall while new chemistries including sodium-ion enter commercial deployment."
            />
            
            <div className="mt-6 flex justify-center">
              <nav className="inline-flex rounded-md shadow">
                <a href="#" className="py-2 px-4 bg-white border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-l-md">Previous</a>
                <a href="#" className="py-2 px-4 bg-blue-600 border border-blue-600 text-sm font-medium text-white hover:bg-blue-700">1</a>
                <a href="#" className="py-2 px-4 bg-white border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">2</a>
                <a href="#" className="py-2 px-4 bg-white border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">3</a>
                <a href="#" className="py-2 px-4 bg-white border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-r-md">Next</a>
              </nav>
            </div>
          </div>
        </div>
        
        {/* Related Searches */}
        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-800 mb-3">Related Searches</h3>
          <div className="flex flex-wrap gap-2">
            <a href="#" className="bg-gray-100 hover:bg-gray-200 rounded-full px-4 py-2 text-sm text-gray-700">renewable energy investment trends</a>
            <a href="#" className="bg-gray-100 hover:bg-gray-200 rounded-full px-4 py-2 text-sm text-gray-700">solar panel efficiency comparison</a>
            <a href="#" className="bg-gray-100 hover:bg-gray-200 rounded-full px-4 py-2 text-sm text-gray-700">offshore wind technology advances</a>
            <a href="#" className="bg-gray-100 hover:bg-gray-200 rounded-full px-4 py-2 text-sm text-gray-700">battery storage grid integration</a>
            <a href="#" className="bg-gray-100 hover:bg-gray-200 rounded-full px-4 py-2 text-sm text-gray-700">green hydrogen production methods</a>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t mt-12 py-6">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              © 2025 Find. Powered by Groq Compound Beta.
            </div>
            <div className="flex space-x-6">
              <a href="#" className="text-sm text-gray-600 hover:text-blue-600">About</a>
              <a href="#" className="text-sm text-gray-600 hover:text-blue-600">Privacy</a>
              <a href="#" className="text-sm text-gray-600 hover:text-blue-600">Terms</a>
              <a href="#" className="text-sm text-gray-600 hover:text-blue-600">Settings</a>
              <a href="#" className="text-sm text-gray-600 hover:text-blue-600">Feedback</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FindWireframe;
