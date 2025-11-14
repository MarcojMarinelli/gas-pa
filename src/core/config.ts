import { Config } from '../types';

class ConfigManager {
  private static instance: ConfigManager;
  private config: Config;
  
  private constructor() {
    this.config = this.loadConfig();
  }
  
  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }
  
  private loadConfig(): Config {
    // Try to load from Script Properties first
    const scriptProperties = PropertiesService.getScriptProperties();
    const storedConfig = scriptProperties.getProperty('CONFIG');
    
    if (storedConfig) {
      return JSON.parse(storedConfig);
    }
    
    // Default configuration
    return {
      version: '1.0.0',
      environment: this.detectEnvironment(),
      features: {
        emailProcessing: true,
        aiIntegration: false,
        calendarSync: false
      },
      limits: {
        maxEmailsPerRun: 50,
        maxApiCallsPerDay: 1000
      }
    };
  }
  
  private detectEnvironment(): 'development' | 'production' {
    const userEmail = Session.getActiveUser().getEmail();
    // Replace with your personal email
    return userEmail.includes('your.personal') ? 'development' : 'production';
  }
  
  get<K extends keyof Config>(key: K): Config[K] {
    return this.config[key];
  }
  
  set<K extends keyof Config>(key: K, value: Config[K]): void {
    this.config[key] = value;
    this.saveConfig();
  }
  
  private saveConfig(): void {
    const scriptProperties = PropertiesService.getScriptProperties();
    scriptProperties.setProperty('CONFIG', JSON.stringify(this.config));
  }
  
  isFeatureEnabled(feature: keyof Config['features']): boolean {
    return this.config.features[feature];
  }
}

export default ConfigManager.getInstance();
