import { useState } from "react";
import { Link } from "wouter";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <div className="w-10 h-10 mr-2">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <path d="M70 40C70 56.5685 56.5685 70 40 70C23.4315 70 10 56.5685 10 40C10 23.4315 23.4315 10 40 10C56.5685 10 70 23.4315 70 40Z" fill="#5E17EB"/>
                <path d="M40 70C35 70 25 68 15 55L25 45C30 55 35 60 40 60C45 60 50 55 55 50L90 50L80 60L70 70C65 70 55 70 40 70Z" fill="#00D4C8"/>
                <circle cx="40" cy="40" r="20" fill="white"/>
                <path d="M45 30L35 45L25 35" stroke="#5E17EB" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-2xl font-bold text-[hsl(var(--primary))]">Find</span>
          </Link>
        </div>
        
        <nav className="hidden md:flex space-x-4">
          <Link href="/about" className="text-[hsl(var(--neutral-muted))] hover:text-[hsl(var(--primary))] transition-colors">
            About
          </Link>
          <Link href="/tools" className="text-[hsl(var(--neutral-muted))] hover:text-[hsl(var(--primary))] transition-colors">
            Tools
          </Link>
          <Link href="/settings" className="text-[hsl(var(--neutral-muted))] hover:text-[hsl(var(--primary))] transition-colors">
            Settings
          </Link>
          <Link href="/signin" className="bg-[hsl(var(--primary))] text-white px-4 py-1 rounded-full hover:bg-[hsl(var(--primary-dark))] transition-colors">
            Sign In
          </Link>
        </nav>
        
        <button 
          className="md:hidden"
          aria-label="Menu"
          onClick={toggleMenu}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" x2="20" y1="12" y2="12"/>
            <line x1="4" x2="20" y1="6" y2="6"/>
            <line x1="4" x2="20" y1="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200">
          <div className="flex flex-col px-4 py-2 space-y-3">
            <Link href="/about" className="py-2 text-[hsl(var(--neutral-muted))] hover:text-[hsl(var(--primary))] transition-colors">
              About
            </Link>
            <Link href="/tools" className="py-2 text-[hsl(var(--neutral-muted))] hover:text-[hsl(var(--primary))] transition-colors">
              Tools
            </Link>
            <Link href="/settings" className="py-2 text-[hsl(var(--neutral-muted))] hover:text-[hsl(var(--primary))] transition-colors">
              Settings
            </Link>
            <Link href="/signin" className="py-2 text-[hsl(var(--primary))] font-medium">
              Sign In
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
