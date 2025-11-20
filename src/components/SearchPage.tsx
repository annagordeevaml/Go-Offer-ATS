import React, { useState } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import Header from './Header';
import ChatBot from './ChatBot';

interface ExampleCard {
  id: string;
  title: string;
  description: string;
}

interface SearchPageProps {
  onNavigate?: (page: 'Search' | 'My Jobs' | 'Analytics') => void;
}

const SearchPage: React.FC<SearchPageProps> = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const exampleCards: ExampleCard[] = [
    {
      id: '1',
      title: 'DevOps Engineer in Berlin',
      description: '5+ years experience with AWS, Kubernetes',
    },
    {
      id: '2',
      title: 'Senior Product Manager, Remote',
      description: 'B2B SaaS background, US timezone',
    },
    {
      id: '3',
      title: 'Data Scientist with ML experience',
      description: 'Python, TensorFlow, 3+ years',
    },
  ];

  const filterOptions = [
    'Job Title',
    'Location',
    'Visa Status',
    'English Level',
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Search query:', searchQuery);
  };

  const handleExampleClick = (title: string) => {
    setSearchQuery(title);
    console.log('Example clicked:', title);
  };

  const handleFilterClick = (filter: string) => {
    setActiveFilter(filter);
    console.log('Filter clicked:', filter);
    setTimeout(() => {
      alert(`Filter: ${filter} - Coming soon!`);
      setActiveFilter(null);
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E8E9EB] via-[#E0E2E5] to-[#E8E9EB] relative overflow-hidden">
      
      <Header activePage="Search" />
      
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Hero Section */}
        <section className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-[#7C3AED] via-[#06B6D4] to-[#7C3AED] bg-clip-text text-transparent animate-gradient-x">
            Find Your Perfect Candidate
          </h1>
          <p className="text-lg sm:text-xl text-[#e0e7ff] mt-4">
            500+ IT professionals ready for US & EU markets
          </p>
        </section>

        {/* Search Bar */}
        <section className="mb-8">
          <form onSubmit={handleSearch} className="relative">
            <div className="search-bar-container relative flex items-center gap-3 rounded-2xl p-2 focus-within:ring-0 transition-all duration-300">
              <Search className="absolute left-4 text-white w-5 h-5 z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Product manager with EdTech experience..."
                className="flex-1 pl-12 pr-4 py-4 bg-transparent text-white placeholder:text-[#e0e7ff]/85 focus:outline-none text-lg z-10"
                aria-label="Search for candidates"
              />
              <button
                type="submit"
                className="search-button px-8 py-4 bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white font-semibold rounded-full hover:shadow-[0_0_20px_rgba(124,58,237,0.6)] transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#06B6D4] focus:ring-offset-2 focus:ring-offset-transparent z-10"
              >
                Search
              </button>
            </div>
          </form>
        </section>

        {/* Filter Chips */}
        <section className="mb-12">
          <p className="text-[#e0e7ff] text-sm mb-4 text-center">or refine with filters ↓</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {filterOptions.map((filter) => (
              <button
                key={filter}
                onClick={() => handleFilterClick(filter)}
                className={`px-6 py-2 rounded-full border-2 border-[#7C3AED] text-[#e0e7ff] font-medium hover:bg-[#7C3AED]/20 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:ring-offset-2 focus:ring-offset-transparent ${
                  activeFilter === filter ? 'bg-[#7C3AED]/20 shadow-[0_0_15px_rgba(124,58,237,0.4)]' : ''
                }`}
                aria-label={`Filter by ${filter}`}
              >
                {filter}
                <ChevronDown className="inline-block ml-2 w-4 h-4" aria-hidden="true" />
              </button>
            ))}
            <button
              onClick={() => handleFilterClick('More Filters')}
              className="px-6 py-2 rounded-full border-2 border-[#7C3AED] text-[#e0e7ff] font-medium hover:bg-[#7C3AED]/20 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:ring-offset-2 focus:ring-offset-transparent"
              aria-label="More filters"
            >
              More Filters
            </button>
          </div>
        </section>

        {/* Empty State / Example Cards */}
        {!searchQuery && (
          <section>
            <p className="text-[#e0e7ff] text-center mb-6 text-lg">Try searching:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {exampleCards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => handleExampleClick(card.title)}
                  className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10 hover:border-[#7C3AED] hover:shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all duration-300 hover:scale-105 text-left focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:ring-offset-2 focus:ring-offset-transparent group"
                  aria-label={`Search for ${card.title}`}
                >
                  <h3 className="text-white font-semibold text-lg mb-2 group-hover:text-[#7C3AED] transition-colors duration-300">
                    {card.title}
                  </h3>
                  <p className="text-[#e0e7ff]/70 text-sm">{card.description}</p>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>
      <ChatBot />
    </div>
  );
};

export default SearchPage;

