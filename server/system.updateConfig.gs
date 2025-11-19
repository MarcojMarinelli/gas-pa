/**
 * Server-side configuration management using PropertiesService
 *
 * Handles persistent storage of user preferences and configuration
 * using Google Apps Script PropertiesService for cross-device sync.
 */

/**
 * Update configuration in PropertiesService
 * Called from client via google.script.run
 *
 * @param {string} configKey - The configuration key to update
 * @param {Object} configData - The configuration data to store
 * @returns {Object} Response with success status
 */
function updateConfig(configKey, configData) {
  try {
    // Validate input
    if (!configKey || typeof configKey !== 'string') {
      throw new Error('Invalid configuration key');
    }

    // Get user properties (persisted per user)
    const userProperties = PropertiesService.getUserProperties();

    // Add metadata
    const dataWithMeta = {
      ...configData,
      lastSyncTime: Date.now(),
      lastModified: new Date().toISOString()
    };

    // Store as JSON string
    userProperties.setProperty(configKey, JSON.stringify(dataWithMeta));

    // Log for debugging (can be removed in production)
    console.log(`Updated config: ${configKey}`, dataWithMeta);

    return {
      success: true,
      data: dataWithMeta,
      timestamp: Date.now()
    };

  } catch (error) {
    console.error('Failed to update config:', error);
    return {
      success: false,
      error: error.message || 'Failed to update configuration',
      timestamp: Date.now()
    };
  }
}

/**
 * Get configuration from PropertiesService
 *
 * @param {string} configKey - The configuration key to retrieve
 * @returns {Object} Response with configuration data
 */
function getConfig(configKey) {
  try {
    // Validate input
    if (!configKey || typeof configKey !== 'string') {
      throw new Error('Invalid configuration key');
    }

    // Get user properties
    const userProperties = PropertiesService.getUserProperties();
    const stored = userProperties.getProperty(configKey);

    if (stored) {
      const data = JSON.parse(stored);
      return {
        success: true,
        data: data,
        timestamp: Date.now()
      };
    }

    // No stored config found
    return {
      success: true,
      data: null,
      timestamp: Date.now()
    };

  } catch (error) {
    console.error('Failed to get config:', error);
    return {
      success: false,
      error: error.message || 'Failed to retrieve configuration',
      timestamp: Date.now()
    };
  }
}

/**
 * Delete configuration from PropertiesService
 *
 * @param {string} configKey - The configuration key to delete
 * @returns {Object} Response with success status
 */
function deleteConfig(configKey) {
  try {
    // Validate input
    if (!configKey || typeof configKey !== 'string') {
      throw new Error('Invalid configuration key');
    }

    // Get user properties
    const userProperties = PropertiesService.getUserProperties();
    userProperties.deleteProperty(configKey);

    return {
      success: true,
      timestamp: Date.now()
    };

  } catch (error) {
    console.error('Failed to delete config:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete configuration',
      timestamp: Date.now()
    };
  }
}

/**
 * Get all user configurations
 *
 * @returns {Object} Response with all configuration data
 */
function getAllConfigs() {
  try {
    const userProperties = PropertiesService.getUserProperties();
    const all = userProperties.getProperties();

    // Parse JSON values
    const configs = {};
    for (const key in all) {
      try {
        configs[key] = JSON.parse(all[key]);
      } catch (e) {
        // If parsing fails, store as string
        configs[key] = all[key];
      }
    }

    return {
      success: true,
      data: configs,
      timestamp: Date.now()
    };

  } catch (error) {
    console.error('Failed to get all configs:', error);
    return {
      success: false,
      error: error.message || 'Failed to retrieve configurations',
      timestamp: Date.now()
    };
  }
}

/**
 * Clear all user configurations
 *
 * @returns {Object} Response with success status
 */
function clearAllConfigs() {
  try {
    const userProperties = PropertiesService.getUserProperties();
    userProperties.deleteAllProperties();

    return {
      success: true,
      timestamp: Date.now()
    };

  } catch (error) {
    console.error('Failed to clear configs:', error);
    return {
      success: false,
      error: error.message || 'Failed to clear configurations',
      timestamp: Date.now()
    };
  }
}

/**
 * Get system configuration (script properties)
 * Used for app-wide settings
 *
 * @returns {Object} System configuration
 */
function getSystemConfig() {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const props = scriptProperties.getProperties();

    // Parse JSON values
    const config = {};
    for (const key in props) {
      try {
        config[key] = JSON.parse(props[key]);
      } catch (e) {
        config[key] = props[key];
      }
    }

    return {
      success: true,
      data: config,
      timestamp: Date.now()
    };

  } catch (error) {
    console.error('Failed to get system config:', error);
    return {
      success: false,
      error: error.message || 'Failed to retrieve system configuration',
      timestamp: Date.now()
    };
  }
}

/**
 * Execute an action on the server
 *
 * @param {string} action - The action to execute
 * @param {Object} params - Action parameters
 * @returns {Object} Action result
 */
function executeAction(action, params) {
  try {
    switch (action) {
      case 'resetPreferences':
        return clearAllConfigs();

      case 'exportPreferences':
        return getAllConfigs();

      case 'importPreferences':
        if (!params || typeof params !== 'object') {
          throw new Error('Invalid import data');
        }
        for (const key in params) {
          updateConfig(key, params[key]);
        }
        return {
          success: true,
          data: { imported: Object.keys(params).length },
          timestamp: Date.now()
        };

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Failed to execute action:', error);
    return {
      success: false,
      error: error.message || 'Action execution failed',
      timestamp: Date.now()
    };
  }
}

/**
 * Health check / ping endpoint
 *
 * @returns {Object} Server status
 */
function ping() {
  return {
    success: true,
    data: {
      status: 'healthy',
      version: '1.0.0',
      timestamp: Date.now()
    },
    timestamp: Date.now()
  };
}

/**
 * Upload data to server
 *
 * @param {string} dataType - Type of data being uploaded
 * @param {Object} data - The data to upload
 * @returns {Object} Upload result
 */
function uploadData(dataType, data) {
  try {
    // Store data with a prefixed key
    const key = `data_${dataType}`;
    return updateConfig(key, data);

  } catch (error) {
    console.error('Failed to upload data:', error);
    return {
      success: false,
      error: error.message || 'Upload failed',
      timestamp: Date.now()
    };
  }
}

/**
 * Download data from server
 *
 * @param {string} dataType - Type of data to download
 * @param {Object} params - Download parameters
 * @returns {Object} Downloaded data
 */
function downloadData(dataType, params) {
  try {
    // Retrieve data with a prefixed key
    const key = `data_${dataType}`;
    return getConfig(key);

  } catch (error) {
    console.error('Failed to download data:', error);
    return {
      success: false,
      error: error.message || 'Download failed',
      timestamp: Date.now()
    };
  }
}

/**
 * Migration helper: Convert old format to new format
 * Run this once if migrating from a different storage system
 */
function migrateOldPreferences() {
  try {
    const userProperties = PropertiesService.getUserProperties();

    // Check for old format preferences
    const oldPrefs = userProperties.getProperty('preferences');
    if (oldPrefs) {
      // Parse and migrate to new format
      const parsed = JSON.parse(oldPrefs);
      updateConfig('ui_preferences', parsed);

      // Remove old format
      userProperties.deleteProperty('preferences');

      return {
        success: true,
        data: { migrated: true },
        timestamp: Date.now()
      };
    }

    return {
      success: true,
      data: { migrated: false },
      timestamp: Date.now()
    };

  } catch (error) {
    console.error('Migration failed:', error);
    return {
      success: false,
      error: error.message || 'Migration failed',
      timestamp: Date.now()
    };
  }
}