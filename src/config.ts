/**
 * Configuration management for PA Tool
 */

interface Config {
  SHEET_ID: string;
  OPENAI_API_KEY: string;
  SLACK_WEBHOOK: string;
  EMAIL_RECIPIENTS: string;
  LOG_LEVEL: 'DEBUG' | 'INFO' | 'ERROR';
}

class ConfigManager {
  private static instance: ConfigManager;
  private properties = PropertiesService.getScriptProperties();
  
  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }
  
  get(key: keyof Config): string {
    return this.properties.getProperty(key) || '';
  }
  
  set(key: string, value: string): void {
    this.properties.setProperty(key, value);
  }
  
  getAll(): Config {
    const props = this.properties.getProperties();
    return {
      SHEET_ID: props.SHEET_ID || '',
      OPENAI_API_KEY: props.OPENAI_API_KEY || '',
      SLACK_WEBHOOK: props.SLACK_WEBHOOK || '',
      EMAIL_RECIPIENTS: props.EMAIL_RECIPIENTS || '',
      LOG_LEVEL: (props.LOG_LEVEL as Config['LOG_LEVEL']) || 'INFO'
    };
  }
}

// Helper function for easy access
function getConfig(key: keyof Config): string {
  return ConfigManager.getInstance().get(key);
}

function setConfig(key: string, value: string): void {
  ConfigManager.getInstance().set(key, value);
}
