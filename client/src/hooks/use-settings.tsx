import { useState, useEffect, createContext, useContext } from 'react';
import { useTheme } from 'next-themes';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export interface AppSettings {
  // Appearance settings
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large' | 'x-large';
  
  // Search settings
  resultsPerPage: number;
  defaultTab: 'all' | 'ai' | 'web' | 'news' | 'images';
  searchMode: 'balanced' | 'comprehensive' | 'recent';
  regionAutodetect: boolean;
  defaultRegion: string;
  
  // Privacy settings
  saveHistory: boolean;
  safeSearch: 'strict' | 'moderate' | 'off';
}

const defaultSettings: AppSettings = {
  theme: 'system',
  fontSize: 'medium',
  resultsPerPage: 10,
  defaultTab: 'all',
  searchMode: 'balanced',
  regionAutodetect: true,
  defaultRegion: 'global',
  saveHistory: true,
  safeSearch: 'moderate',
};

const SettingsContext = createContext<{
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  resetSettings: () => void;
  isLoading: boolean;
}>({
  settings: defaultSettings,
  updateSettings: () => {},
  resetSettings: () => {},
  isLoading: false,
});

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const { setTheme } = useTheme();
  const queryClient = useQueryClient();

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      try {
        // First try to load from localStorage
        const savedSettings = localStorage.getItem('appSettings');
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          setSettings(current => ({ ...current, ...parsedSettings }));
        }

        // If user is logged in, try to get server settings and merge/override
        if (user) {
          const response = await apiRequest('GET', '/api/user/preferences');
          if (response.ok) {
            const userPrefs = await response.json();
            
            // Map server preferences to app settings
            const serverSettings: Partial<AppSettings> = {
              defaultRegion: userPrefs.defaultRegion || defaultSettings.defaultRegion,
              searchMode: userPrefs.searchFilters?.searchMode || defaultSettings.searchMode,
              safeSearch: userPrefs.searchFilters?.safeSearch || defaultSettings.safeSearch,
              theme: userPrefs.contentPreferences?.theme || defaultSettings.theme,
              fontSize: userPrefs.contentPreferences?.fontSize || defaultSettings.fontSize,
              saveHistory: userPrefs.contentPreferences?.saveHistory ?? defaultSettings.saveHistory,
              regionAutodetect: userPrefs.contentPreferences?.regionAutodetect ?? defaultSettings.regionAutodetect,
              resultsPerPage: userPrefs.contentPreferences?.resultsPerPage || defaultSettings.resultsPerPage,
              defaultTab: userPrefs.contentPreferences?.defaultTab || defaultSettings.defaultTab,
            };
            
            // Merge server settings, prioritizing them over local settings
            setSettings(current => ({ ...current, ...serverSettings }));
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [user]);

  // Apply theme whenever it changes
  useEffect(() => {
    if (settings.theme) {
      setTheme(settings.theme);
    }
  }, [settings.theme, setTheme]);
  
  // Detect system theme preference for accurate UI display
  useEffect(() => {
    if (settings.theme === 'system') {
      // Check if system preference is dark
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      // Update the UI to show the correct selected theme without changing the actual theme setting
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      // Listen for changes to system theme
      const handleChange = (e: MediaQueryListEvent) => {
        // Only update if we're still using system theme
        if (settings.theme === 'system') {
          // This will force a re-render with the new system preference
          setSettings(prev => ({...prev}));
        }
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [settings.theme]);

  // Apply font size whenever it changes
  useEffect(() => {
    const root = document.documentElement;
    switch (settings.fontSize) {
      case 'small':
        root.style.fontSize = '14px';
        break;
      case 'medium':
        root.style.fontSize = '16px';
        break;
      case 'large':
        root.style.fontSize = '18px';
        break;
      case 'x-large':
        root.style.fontSize = '20px';
        break;
    }
  }, [settings.fontSize]);

  // Save settings to server mutation
  const saveToServerMutation = useMutation({
    mutationFn: async (newSettings: Partial<AppSettings>) => {
      // Map app settings to server preferences format
      const serverPrefs = {
        defaultRegion: newSettings.defaultRegion,
        searchFilters: {
          ...(newSettings.searchMode && { searchMode: newSettings.searchMode }),
          ...(newSettings.safeSearch && { safeSearch: newSettings.safeSearch }),
        },
        contentPreferences: {
          ...(newSettings.theme && { theme: newSettings.theme }),
          ...(newSettings.fontSize && { fontSize: newSettings.fontSize }),
          ...(typeof newSettings.saveHistory === 'boolean' && { saveHistory: newSettings.saveHistory }),
          ...(typeof newSettings.regionAutodetect === 'boolean' && { regionAutodetect: newSettings.regionAutodetect }),
          ...(newSettings.resultsPerPage && { resultsPerPage: newSettings.resultsPerPage }),
          ...(newSettings.defaultTab && { defaultTab: newSettings.defaultTab }),
        }
      };

      const response = await apiRequest('POST', '/api/user/preferences', serverPrefs);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save settings",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update settings function
  const updateSettings = (newSettings: Partial<AppSettings>) => {
    // Update local state
    setSettings(current => {
      const updated = { ...current, ...newSettings };
      
      // Save to localStorage
      localStorage.setItem('appSettings', JSON.stringify(updated));
      
      // If user is authenticated, save to server
      if (user) {
        saveToServerMutation.mutate(newSettings);
      }
      
      return updated;
    });

    // Show success toast
    toast({
      title: "Settings updated",
      description: "Your settings have been saved successfully.",
    });
  };

  // Reset settings function
  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.setItem('appSettings', JSON.stringify(defaultSettings));
    
    if (user) {
      saveToServerMutation.mutate(defaultSettings);
    }

    toast({
      title: "Settings reset",
      description: "All settings have been reset to default values.",
    });
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);