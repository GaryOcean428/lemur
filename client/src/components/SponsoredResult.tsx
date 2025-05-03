export default function SponsoredResult() {
  return (
    <div className="bg-white rounded-xl shadow-md p-4 mb-6 border-l-4 border-[hsl(var(--sponsored))]">
      <div className="flex items-start">
        <div className="flex-1">
          <div className="flex items-center">
            <span className="text-xs font-medium px-2 py-0.5 bg-[hsl(var(--sponsored))] bg-opacity-20 text-[hsl(var(--neutral))] rounded mr-2">
              Sponsored
            </span>
            <span className="text-xs text-[hsl(var(--neutral-muted))]">
              mindfulnessapp.com
            </span>
          </div>
          <h3 className="text-lg font-medium mt-1">
            <a href="#" className="text-[hsl(var(--primary))] hover:underline">
              Mindfulness App - Start Your Meditation Journey Today
            </a>
          </h3>
          <p className="text-sm text-[hsl(var(--neutral-muted))] mt-1">
            Download our top-rated meditation app with guided sessions for beginners. Free 7-day trial available.
          </p>
          <div className="mt-2">
            <a href="#" className="text-sm text-[hsl(var(--primary))] hover:underline">
              Download Now
            </a>
          </div>
        </div>
        <div className="ml-4">
          <div className="w-16 h-16 bg-[hsl(var(--neutral-light))] rounded overflow-hidden flex items-center justify-center">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="32" 
              height="32" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#5E17EB" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5V5a2 2 0 0 0 2 2h.5A2.5 2.5 0 0 1 17 9.5a2.5 2.5 0 0 1 2.5 2.5"/>
              <path d="M17 9.5a2.5 2.5 0 0 1 2.5-2.5H20a2 2 0 0 0 2-2v-.5A2.5 2.5 0 0 1 19.5 2"/>
              <path d="M12 9.5a2.5 2.5 0 0 1-2.5 2.5H9a2 2 0 0 0-2 2v.5A2.5 2.5 0 0 1 4.5 17"/>
              <path d="M4.5 17A2.5 2.5 0 0 1 2 14.5V14a2 2 0 0 0-2-2v-.5A2.5 2.5 0 0 1 2.5 9"/>
              <path d="M12 7v12"/>
              <path d="M7.5 12H9"/>
              <path d="M15 12h1.5"/>
              <path d="M12 16v3"/>
              <path d="M12 12v-1"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
