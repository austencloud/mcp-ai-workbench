import { writable, type Writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface VoiceSettings {
  enableAIProcessing: boolean;
  language: string;
  sensitivity: 'low' | 'medium' | 'high';
  autoPauseOnBlur: boolean;
  processingTimeout: number;
  appendMode: boolean;
}

export interface GeneralSettings {
  theme: 'auto' | 'dark' | 'light';
  defaultAIProvider: string;
  defaultModel: string;
  animationsEnabled: boolean;
  soundEnabled: boolean;
}

export interface ApplicationSettings {
  voice: VoiceSettings;
  general: GeneralSettings;
}

// Default settings
const defaultSettings: ApplicationSettings = {
  voice: {
    enableAIProcessing: true,
    language: 'en-US',
    sensitivity: 'medium',
    autoPauseOnBlur: true,
    processingTimeout: 15000,
    appendMode: true
  },
  general: {
    theme: 'auto',
    defaultAIProvider: 'ollama',
    defaultModel: 'openhermes:latest',
    animationsEnabled: true,
    soundEnabled: false
  }
};

// Load settings from localStorage
function loadSettings(): ApplicationSettings {
  if (!browser) return defaultSettings;
  
  try {
    const stored = localStorage.getItem('mcp-workbench-settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure all properties exist
      return {
        voice: { ...defaultSettings.voice, ...parsed.voice },
        general: { ...defaultSettings.general, ...parsed.general }
      };
    }
  } catch (error) {
    console.warn('Failed to load settings from localStorage:', error);
  }
  
  return defaultSettings;
}

// Save settings to localStorage
function saveSettings(settings: ApplicationSettings): void {
  if (!browser) return;
  
  try {
    localStorage.setItem('mcp-workbench-settings', JSON.stringify(settings));
  } catch (error) {
    console.warn('Failed to save settings to localStorage:', error);
  }
}

// Create the settings store
function createSettingsStore() {
  const { subscribe, set, update }: Writable<ApplicationSettings> = writable(loadSettings());

  return {
    subscribe,
    
    // Update voice settings
    updateVoiceSettings: (voiceSettings: Partial<VoiceSettings>) => {
      update(settings => {
        const newSettings = {
          ...settings,
          voice: { ...settings.voice, ...voiceSettings }
        };
        saveSettings(newSettings);
        return newSettings;
      });
    },
    
    // Update general settings
    updateGeneralSettings: (generalSettings: Partial<GeneralSettings>) => {
      update(settings => {
        const newSettings = {
          ...settings,
          general: { ...settings.general, ...generalSettings }
        };
        saveSettings(newSettings);
        return newSettings;
      });
    },
    
    // Update specific setting
    updateSetting: <K extends keyof ApplicationSettings>(
      category: K,
      key: keyof ApplicationSettings[K],
      value: any
    ) => {
      update(settings => {
        const newSettings = {
          ...settings,
          [category]: {
            ...settings[category],
            [key]: value
          }
        };
        saveSettings(newSettings);
        return newSettings;
      });
    },
    
    // Reset to defaults
    reset: () => {
      set(defaultSettings);
      saveSettings(defaultSettings);
    },
    
    // Reset specific category
    resetCategory: <K extends keyof ApplicationSettings>(category: K) => {
      update(settings => {
        const newSettings = {
          ...settings,
          [category]: defaultSettings[category]
        };
        saveSettings(newSettings);
        return newSettings;
      });
    },
    
    // Export settings
    export: (): string => {
      let currentSettings: ApplicationSettings;
      subscribe(settings => currentSettings = settings)();
      return JSON.stringify(currentSettings!, null, 2);
    },
    
    // Import settings
    import: (settingsJson: string): boolean => {
      try {
        const imported = JSON.parse(settingsJson);
        const newSettings = {
          voice: { ...defaultSettings.voice, ...imported.voice },
          general: { ...defaultSettings.general, ...imported.general }
        };
        set(newSettings);
        saveSettings(newSettings);
        return true;
      } catch (error) {
        console.warn('Failed to import settings:', error);
        return false;
      }
    }
  };
}

export const settingsStore = createSettingsStore();

// Derived stores for specific categories
export const voiceSettings = {
  subscribe: (callback: (value: VoiceSettings) => void) => {
    return settingsStore.subscribe(settings => callback(settings.voice));
  }
};

export const generalSettings = {
  subscribe: (callback: (value: GeneralSettings) => void) => {
    return settingsStore.subscribe(settings => callback(settings.general));
  }
};

// Helper functions for common operations
export function isVoiceAIProcessingEnabled(): boolean {
  let enabled = false;
  voiceSettings.subscribe(settings => enabled = settings.enableAIProcessing)();
  return enabled;
}

export function getVoiceProcessingTimeout(): number {
  let timeout = 15000;
  voiceSettings.subscribe(settings => timeout = settings.processingTimeout)();
  return timeout;
}

export function isVoiceAppendModeEnabled(): boolean {
  let appendMode = true;
  voiceSettings.subscribe(settings => appendMode = settings.appendMode)();
  return appendMode;
}
