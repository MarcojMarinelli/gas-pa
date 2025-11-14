/**
 * Enhanced Configuration Manager with validation and hot-reload
 */

import { ValidationResult, ConfigChangeCallback, ConfigValue } from './types';

export class ConfigManager {
  private static instance: ConfigManager;
  private config: Map<string, ConfigValue>;
  private subscribers: Set<ConfigChangeCallback>;
  private cache: Map<string, any>;
  private lastReload: number;
  private readonly RELOAD_INTERVAL = 60000; // 1 minute

  private constructor() {
    this.config = new Map();
    this.subscribers = new Set();
    this.cache = new Map();
    this.lastReload = Date.now();
    this.initializeDefaults();
    this.load();
    this.ensureDefaults(); // Ensure all defaults are saved to PropertiesService
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private initializeDefaults(): void {
    // Core configuration with validation
    this.defineConfig('LOG_LEVEL', {
      value: 'INFO',
      type: 'string',
      required: true,
      validator: (v) => ['DEBUG', 'INFO', 'WARN', 'ERROR'].includes(v),
      description: 'Logging level for the application'
    });

    this.defineConfig('OPENAI_API_KEY', {
      value: '',
      type: 'string',
      required: false,
      validator: (v) => !v || v.startsWith('sk-'),
      description: 'OpenAI API key for AI features'
    });

    this.defineConfig('OPENAI_MODEL', {
      value: 'gpt-4-turbo-preview',
      type: 'string',
      required: false,
      description: 'OpenAI model to use'
    });

    this.defineConfig('MAX_EMAILS_PER_RUN', {
      value: 50,
      type: 'number',
      required: true,
      validator: (v) => v > 0 && v <= 100,
      description: 'Maximum emails to process per run'
    });

    this.defineConfig('BATCH_SIZE', {
      value: 10,
      type: 'number',
      required: true,
      validator: (v) => v > 0 && v <= 50,
      description: 'Batch size for processing'
    });

    this.defineConfig('CACHE_TTL_SECONDS', {
      value: 300,
      type: 'number',
      required: true,
      validator: (v) => v >= 0,
      description: 'Cache time-to-live in seconds'
    });

    this.defineConfig('CACHE_CAPACITY', {
      value: 100,
      type: 'number',
      required: true,
      validator: (v) => v > 0 && v <= 1000,
      description: 'Maximum number of items in memory cache'
    });

    this.defineConfig('ENABLE_AI_CLASSIFICATION', {
      value: true,
      type: 'boolean',
      required: true,
      description: 'Enable AI-powered email classification'
    });

    this.defineConfig('ENABLE_DRAFT_GENERATION', {
      value: true,
      type: 'boolean',
      required: true,
      description: 'Enable AI draft reply generation'
    });

    this.defineConfig('CONFIDENCE_THRESHOLD', {
      value: 0.85,
      type: 'number',
      required: true,
      validator: (v) => v >= 0 && v <= 1,
      description: 'Minimum confidence for auto-actions'
    });

    this.defineConfig('LEARNING_RATE', {
      value: 0.1,
      type: 'number',
      required: true,
      validator: (v) => v > 0 && v <= 1,
      description: 'Learning rate for classification improvements'
    });

    this.defineConfig('SLA_HIGH_PRIORITY_HOURS', {
      value: 4,
      type: 'number',
      required: true,
      validator: (v) => v > 0,
      description: 'SLA for high priority emails (hours)'
    });

    this.defineConfig('SLA_MEDIUM_PRIORITY_HOURS', {
      value: 24,
      type: 'number',
      required: true,
      validator: (v) => v > 0,
      description: 'SLA for medium priority emails (hours)'
    });

    this.defineConfig('SLA_LOW_PRIORITY_HOURS', {
      value: 72,
      type: 'number',
      required: true,
      validator: (v) => v > 0,
      description: 'SLA for low priority emails (hours)'
    });

    this.defineConfig('PROCESS_WEEKENDS', {
      value: false,
      type: 'boolean',
      required: true,
      description: 'Process emails on weekends'
    });

    this.defineConfig('LEARNING_ENABLED', {
      value: true,
      type: 'boolean',
      required: true,
      description: 'Enable learning system for classification improvement'
    });

    this.defineConfig('WEB_APP_URL', {
      value: '',
      type: 'string',
      required: false,
      description: 'Deployed web app URL'
    });

    this.defineConfig('MAIN_SPREADSHEET_ID', {
      value: '',
      type: 'string',
      required: false,
      description: 'Main database spreadsheet ID'
    });
  }

  private defineConfig(key: string, config: ConfigValue): void {
    this.config.set(key, config);
  }

  validate(): ValidationResult {
    const errors: string[] = [];

    this.config.forEach((config, key) => {
      const value = config.value;

      // For required configs, check if value exists (not null/undefined/empty string)
      if (config.required) {
        if (value === null || value === undefined || value === '') {
          // Only error if it's truly required (not a boolean false or number 0)
          if (config.type !== 'boolean' && config.type !== 'number') {
            errors.push(`Required configuration '${key}' is missing`);
          } else if (value === null || value === undefined) {
            errors.push(`Required configuration '${key}' is missing`);
          }
        }
      }

      if (config.validator && value !== null && value !== undefined && value !== '') {
        if (!config.validator(value)) {
          errors.push(`Configuration '${key}' has invalid value: ${value}`);
        }
      }

      // Type checking
      if (value !== null && value !== undefined && value !== '') {
        const actualType = typeof value;
        if (actualType !== config.type && !(config.type === 'object' && actualType === 'object')) {
          errors.push(`Configuration '${key}' expects type ${config.type} but got ${actualType}`);
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  get<T>(key: string): T | null {
    // Check if reload is needed
    if (Date.now() - this.lastReload > this.RELOAD_INTERVAL) {
      this.reload();
    }

    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key) as T;
    }

    const config = this.config.get(key);
    if (!config) {
      console.warn(`Configuration key '${key}' not found`);
      return null;
    }

    this.cache.set(key, config.value);
    return config.value as T;
  }

  getWithDefault<T>(key: string, defaultValue: T): T {
    const value = this.get<T>(key);
    return value !== null ? value : defaultValue;
  }

  set(key: string, value: any): void {
    const config = this.config.get(key);
    if (!config) {
      throw new Error(`Configuration key '${key}' not defined`);
    }

    // Validate new value
    if (config.validator && !config.validator(value)) {
      throw new Error(`Invalid value for configuration '${key}': ${value}`);
    }

    const oldValue = config.value;
    config.value = value;

    // Clear cache
    this.cache.delete(key);

    // Persist to PropertiesService
    this.save(key, value);

    // Notify subscribers
    this.notifySubscribers(key, oldValue, value);
  }

  private save(key: string, value: any): void {
    try {
      const scriptProperties = PropertiesService.getScriptProperties();
      const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value);
      scriptProperties.setProperty(key, serialized);
    } catch (error) {
      console.error(`Failed to save configuration '${key}':`, error);
    }
  }

  private load(): void {
    try {
      const scriptProperties = PropertiesService.getScriptProperties();
      const properties = scriptProperties.getProperties();

      Object.entries(properties).forEach(([key, value]) => {
        const config = this.config.get(key);
        if (config) {
          try {
            // Parse value based on type
            let parsedValue: any = value;

            switch (config.type) {
              case 'number':
                parsedValue = Number(value);
                break;
              case 'boolean':
                parsedValue = value === 'true';
                break;
              case 'object':
                parsedValue = JSON.parse(value);
                break;
              default:
                parsedValue = value;
            }

            if (config.validator && !config.validator(parsedValue)) {
              console.warn(`Loaded invalid value for '${key}', using default`);
            } else {
              config.value = parsedValue;
            }
          } catch (error) {
            console.error(`Failed to parse configuration '${key}':`, error);
          }
        }
      });
    } catch (error) {
      console.error('Failed to load configuration:', error);
    }
  }

  private ensureDefaults(): void {
    try {
      const scriptProperties = PropertiesService.getScriptProperties();
      const existing = scriptProperties.getProperties();
      let savedCount = 0;

      this.config.forEach((config, key) => {
        // If not in PropertiesService, save the default
        if (!(key in existing) && config.value !== null && config.value !== undefined) {
          const serialized = typeof config.value === 'object'
            ? JSON.stringify(config.value)
            : String(config.value);

          scriptProperties.setProperty(key, serialized);
          savedCount++;
        }
      });

      if (savedCount > 0) {
        console.log(`Saved ${savedCount} default configurations to PropertiesService`);
      }
    } catch (error) {
      console.error('Failed to ensure defaults:', error);
    }
  }

  reload(): void {
    this.cache.clear();
    this.load();
    this.lastReload = Date.now();
    console.log('Configuration reloaded');
  }

  subscribe(callback: ConfigChangeCallback): () => void {
    this.subscribers.add(callback);
    // Return unsubscribe function
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(key: string, oldValue: any, newValue: any): void {
    this.subscribers.forEach(callback => {
      try {
        callback(key, oldValue, newValue);
      } catch (error) {
        console.error('Error in config change subscriber:', error);
      }
    });
  }

  getAllConfigurations(): Record<string, any> {
    const result: Record<string, any> = {};

    this.config.forEach((config, key) => {
      result[key] = {
        value: config.value,
        type: config.type,
        required: config.required,
        description: config.description
      };
    });

    return result;
  }

  exportConfiguration(): string {
    const exportData = {
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      configurations: this.getAllConfigurations()
    };

    return JSON.stringify(exportData, null, 2);
  }

  importConfiguration(jsonString: string): ValidationResult {
    try {
      const importData = JSON.parse(jsonString);

      if (!importData.configurations) {
        return {
          valid: false,
          errors: ['Invalid configuration format: missing configurations']
        };
      }

      const errors: string[] = [];

      Object.entries(importData.configurations).forEach(([key, data]: [string, any]) => {
        try {
          if (this.config.has(key)) {
            this.set(key, data.value);
          } else {
            errors.push(`Unknown configuration key: ${key}`);
          }
        } catch (error: any) {
          errors.push(`Failed to import '${key}': ${error.message}`);
        }
      });

      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      return {
        valid: false,
        errors: ['Invalid JSON format']
      };
    }
  }

  reset(): void {
    this.cache.clear();
    this.initializeDefaults();
    this.load();
  }
}

// Export singleton instance
export default ConfigManager.getInstance();