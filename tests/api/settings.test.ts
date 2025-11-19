/**
 * Settings & Configuration Endpoint Tests
 * Tests for settings handler, user preferences, and system configuration
 *
 * These are template tests - adapt for your testing framework
 */

import {
  SettingsHandler,
  MockBackendSettingsService,
  createSettingsHandler
} from '../../src/webapp/handlers/settings-handler';
import { ApiRequest } from '../../src/webapp/types/api-types';
import {
  UserPreferences,
  SystemConfiguration
} from '../../src/types/shared-models';
import {
  validate,
  userPreferencesSchema,
  systemConfigurationSchema
} from '../../src/types/validators';

/**
 * Mock API Request
 */
function createMockRequest(
  user: string = 'test@example.com',
  postData: any = {}
): ApiRequest {
  return {
    method: 'GET',
    path: '/api/settings/user',
    parameters: {},
    queryString: '',
    postData,
    headers: {},
    user
  };
}

/**
 * Settings Handler Tests
 */
describe('SettingsHandler', () => {
  describe('getUserPreferences', () => {
    it('should get user preferences with defaults', async () => {
      const handler = createSettingsHandler(true); // Use mock
      const request = createMockRequest('user@example.com');

      const preferences = await handler.getUserPreferences(request);

      // Validate structure
      expect(preferences).toBeDefined();
      expect(preferences.email).toBe('user@example.com');
      expect(preferences.timezone).toBeDefined();
      expect(preferences.defaultPageSize).toBe(20);
      expect(preferences.defaultSort).toBeDefined();
      expect(preferences.defaultSort.field).toBe('date');
      expect(preferences.defaultSort.direction).toBe('desc');

      // Validate booleans
      expect(typeof preferences.notifyOnHighPriority).toBe('boolean');
      expect(typeof preferences.notifyOnSLABreach).toBe('boolean');
      expect(typeof preferences.dailySummaryEnabled).toBe('boolean');
      expect(typeof preferences.compactView).toBe('boolean');
      expect(typeof preferences.autoArchiveCompleted).toBe('boolean');

      // Validate SLA hours
      expect(preferences.slaHours).toBeDefined();
      expect(preferences.slaHours!.high).toBe(4);
      expect(preferences.slaHours!.medium).toBe(24);
      expect(preferences.slaHours!.low).toBe(72);

      // Validate with schema
      expect(() => validate(userPreferencesSchema, preferences)).not.toThrow();
    });

    it('should maintain user-specific preferences', async () => {
      const handler = createSettingsHandler(true);

      // Get preferences for user 1
      const request1 = createMockRequest('user1@example.com');
      const prefs1 = await handler.getUserPreferences(request1);

      // Update preferences for user 1
      const updateRequest1 = createMockRequest('user1@example.com', {
        timezone: 'America/Los_Angeles',
        defaultPageSize: 50
      });
      await handler.updateUserPreferences(updateRequest1);

      // Get preferences for user 2 (should have defaults)
      const request2 = createMockRequest('user2@example.com');
      const prefs2 = await handler.getUserPreferences(request2);

      expect(prefs2.timezone).not.toBe('America/Los_Angeles');
      expect(prefs2.defaultPageSize).toBe(20); // Default, not 50
    });
  });

  describe('updateUserPreferences', () => {
    it('should update user preferences', async () => {
      const handler = createSettingsHandler(true);
      const request = createMockRequest('user@example.com', {
        timezone: 'Europe/London',
        defaultPageSize: 30,
        compactView: true,
        notifyOnHighPriority: false
      });

      const updated = await handler.updateUserPreferences(request);

      expect(updated.email).toBe('user@example.com');
      expect(updated.timezone).toBe('Europe/London');
      expect(updated.defaultPageSize).toBe(30);
      expect(updated.compactView).toBe(true);
      expect(updated.notifyOnHighPriority).toBe(false);

      // Other fields should still have defaults
      expect(updated.notifyOnSLABreach).toBe(true);
      expect(updated.dailySummaryEnabled).toBe(true);
    });

    it('should validate preference updates', async () => {
      const handler = createSettingsHandler(true);

      // Invalid page size (> 100)
      const invalidRequest = createMockRequest('user@example.com', {
        defaultPageSize: 150
      });

      await expect(handler.updateUserPreferences(invalidRequest)).rejects.toThrow();
    });

    it('should preserve existing preferences when updating', async () => {
      const handler = createSettingsHandler(true);

      // Initial update
      const request1 = createMockRequest('user@example.com', {
        timezone: 'America/Chicago',
        compactView: true
      });
      await handler.updateUserPreferences(request1);

      // Partial update
      const request2 = createMockRequest('user@example.com', {
        defaultPageSize: 40
      });
      const updated = await handler.updateUserPreferences(request2);

      // Previous settings should be preserved
      expect(updated.timezone).toBe('America/Chicago');
      expect(updated.compactView).toBe(true);
      // New setting applied
      expect(updated.defaultPageSize).toBe(40);
    });

    it('should update SLA hours', async () => {
      const handler = createSettingsHandler(true);
      const request = createMockRequest('user@example.com', {
        slaHours: {
          high: 2,
          medium: 12,
          low: 48
        }
      });

      const updated = await handler.updateUserPreferences(request);

      expect(updated.slaHours).toBeDefined();
      expect(updated.slaHours!.high).toBe(2);
      expect(updated.slaHours!.medium).toBe(12);
      expect(updated.slaHours!.low).toBe(48);
    });

    it('should validate daily summary time format', async () => {
      const handler = createSettingsHandler(true);

      // Valid time
      const validRequest = createMockRequest('user@example.com', {
        dailySummaryTime: '08:30'
      });
      const valid = await handler.updateUserPreferences(validRequest);
      expect(valid.dailySummaryTime).toBe('08:30');

      // Invalid time format
      const invalidRequest = createMockRequest('user@example.com', {
        dailySummaryTime: '25:00' // Invalid hour
      });
      await expect(handler.updateUserPreferences(invalidRequest)).rejects.toThrow();
    });
  });

  describe('resetUserPreferences', () => {
    it('should reset preferences to defaults', async () => {
      const handler = createSettingsHandler(true);

      // Update preferences
      const updateRequest = createMockRequest('user@example.com', {
        timezone: 'Asia/Tokyo',
        defaultPageSize: 75,
        compactView: true,
        notifyOnHighPriority: false
      });
      await handler.updateUserPreferences(updateRequest);

      // Reset
      const resetRequest = createMockRequest('user@example.com');
      const reset = await handler.resetUserPreferences(resetRequest);

      // Should have default values
      expect(reset.timezone).toBe('America/New_York');
      expect(reset.defaultPageSize).toBe(20);
      expect(reset.compactView).toBe(false);
      expect(reset.notifyOnHighPriority).toBe(true);
    });
  });

  describe('getDefaultPreferences', () => {
    it('should return default preferences', async () => {
      const handler = createSettingsHandler(true);
      const request = createMockRequest();

      const defaults = await handler.getDefaultPreferences(request);

      expect(defaults).toBeDefined();
      expect(defaults.email).toBe('');
      expect(defaults.timezone).toBe('America/New_York');
      expect(defaults.defaultPageSize).toBe(20);
      expect(defaults.notifyOnHighPriority).toBe(true);
      expect(defaults.notifyOnSLABreach).toBe(true);
      expect(defaults.dailySummaryEnabled).toBe(true);
      expect(defaults.dailySummaryTime).toBe('09:00');
      expect(defaults.compactView).toBe(false);
      expect(defaults.autoArchiveCompleted).toBe(true);
      expect(defaults.autoArchiveAfterDays).toBe(30);
    });
  });

  describe('getSystemConfiguration', () => {
    it('should get system configuration', async () => {
      const handler = createSettingsHandler(true);
      const request = createMockRequest('admin@example.com');

      const config = await handler.getSystemConfiguration(request);

      // Validate structure
      expect(config).toBeDefined();
      expect(config.version).toBeDefined();
      expect(config.environment).toBeDefined();
      expect(['development', 'staging', 'production']).toContain(config.environment);

      // Validate features
      expect(config.features).toBeDefined();
      expect(typeof config.features.queueManagement).toBe('boolean');
      expect(typeof config.features.autoProcessing).toBe('boolean');
      expect(typeof config.features.slaTracking).toBe('boolean');
      expect(typeof config.features.aiClassification).toBe('boolean');

      // Validate limits
      expect(config.limits).toBeDefined();
      expect(config.limits.maxEmailsPerRun).toBeGreaterThan(0);
      expect(config.limits.maxQueueSize).toBeGreaterThan(0);
      expect(config.limits.apiRateLimit).toBeGreaterThan(0);
      expect(config.limits.sessionTimeout).toBeGreaterThan(0);

      // Validate integrations
      expect(config.integrations).toBeDefined();
      expect(typeof config.integrations.openaiEnabled).toBe('boolean');

      // Validate with schema
      expect(() => validate(systemConfigurationSchema, config)).not.toThrow();
    });
  });

  describe('updateSystemConfiguration', () => {
    it('should update system configuration', async () => {
      const handler = createSettingsHandler(true);
      const request = createMockRequest('admin@example.com', {
        features: {
          queueManagement: true,
          autoProcessing: true,
          slaTracking: true,
          aiClassification: true
        },
        limits: {
          maxEmailsPerRun: 200,
          maxQueueSize: 2000,
          apiRateLimit: 200,
          sessionTimeout: 7200
        }
      });

      const updated = await handler.updateSystemConfiguration(request);

      expect(updated.features.aiClassification).toBe(true);
      expect(updated.limits.maxEmailsPerRun).toBe(200);
      expect(updated.limits.maxQueueSize).toBe(2000);
      expect(updated.limits.sessionTimeout).toBe(7200);
    });

    it('should enable/disable features', async () => {
      const handler = createSettingsHandler(true);

      // Disable AI classification
      const request1 = createMockRequest('admin@example.com', {
        features: {
          queueManagement: true,
          autoProcessing: true,
          slaTracking: true,
          aiClassification: false
        }
      });
      const updated1 = await handler.updateSystemConfiguration(request1);
      expect(updated1.features.aiClassification).toBe(false);

      // Enable AI classification
      const request2 = createMockRequest('admin@example.com', {
        features: {
          queueManagement: true,
          autoProcessing: true,
          slaTracking: true,
          aiClassification: true
        }
      });
      const updated2 = await handler.updateSystemConfiguration(request2);
      expect(updated2.features.aiClassification).toBe(true);
    });

    it('should update OpenAI integration settings', async () => {
      const handler = createSettingsHandler(true);
      const request = createMockRequest('admin@example.com', {
        integrations: {
          openaiEnabled: true,
          openaiModel: 'gpt-4-turbo'
        }
      });

      const updated = await handler.updateSystemConfiguration(request);

      expect(updated.integrations.openaiEnabled).toBe(true);
      expect(updated.integrations.openaiModel).toBe('gpt-4-turbo');
    });

    it('should validate configuration updates', async () => {
      const handler = createSettingsHandler(true);

      // Invalid environment
      const invalidRequest = createMockRequest('admin@example.com', {
        environment: 'invalid-env'
      });

      await expect(handler.updateSystemConfiguration(invalidRequest)).rejects.toThrow();
    });

    it('should preserve existing config when partially updating', async () => {
      const handler = createSettingsHandler(true);

      // Get initial config
      const getRequest = createMockRequest('admin@example.com');
      const initial = await handler.getSystemConfiguration(getRequest);

      // Update only limits
      const updateRequest = createMockRequest('admin@example.com', {
        limits: {
          maxEmailsPerRun: 150,
          maxQueueSize: 1500,
          apiRateLimit: 150,
          sessionTimeout: 5400
        }
      });
      const updated = await handler.updateSystemConfiguration(updateRequest);

      // Features should be preserved
      expect(updated.features.queueManagement).toBe(initial.features.queueManagement);
      expect(updated.features.autoProcessing).toBe(initial.features.autoProcessing);

      // Limits should be updated
      expect(updated.limits.maxEmailsPerRun).toBe(150);
      expect(updated.limits.maxQueueSize).toBe(1500);
    });
  });

  describe('getDefaultConfiguration', () => {
    it('should return default system configuration', async () => {
      const handler = createSettingsHandler(true);
      const request = createMockRequest('admin@example.com');

      const defaults = await handler.getDefaultConfiguration(request);

      expect(defaults).toBeDefined();
      expect(defaults.version).toBe('1.0.0');
      expect(defaults.environment).toBe('development');
      expect(defaults.features.queueManagement).toBe(true);
      expect(defaults.features.autoProcessing).toBe(true);
      expect(defaults.features.slaTracking).toBe(true);
      expect(defaults.features.aiClassification).toBe(false);
      expect(defaults.limits.maxEmailsPerRun).toBe(100);
      expect(defaults.limits.maxQueueSize).toBe(1000);
      expect(defaults.integrations.openaiEnabled).toBe(false);
    });
  });
});

/**
 * Mock Backend Service Tests
 */
describe('MockBackendSettingsService', () => {
  const backend = new MockBackendSettingsService();

  it('should store and retrieve user preferences', async () => {
    const email = 'test@example.com';

    // Get initial preferences (should be defaults)
    const prefs1 = await backend.getUserPreferences(email);
    expect(prefs1.email).toBe(email);
    expect(prefs1.timezone).toBe('America/New_York');

    // Update preferences
    await backend.updateUserPreferences(email, {
      timezone: 'Europe/Paris',
      compactView: true
    });

    // Get updated preferences
    const prefs2 = await backend.getUserPreferences(email);
    expect(prefs2.timezone).toBe('Europe/Paris');
    expect(prefs2.compactView).toBe(true);
  });

  it('should maintain separate preferences for different users', async () => {
    const user1 = 'user1@example.com';
    const user2 = 'user2@example.com';

    // Update user 1
    await backend.updateUserPreferences(user1, {
      timezone: 'Asia/Tokyo',
      defaultPageSize: 50
    });

    // Update user 2
    await backend.updateUserPreferences(user2, {
      timezone: 'Europe/London',
      defaultPageSize: 30
    });

    // Verify separation
    const prefs1 = await backend.getUserPreferences(user1);
    const prefs2 = await backend.getUserPreferences(user2);

    expect(prefs1.timezone).toBe('Asia/Tokyo');
    expect(prefs1.defaultPageSize).toBe(50);
    expect(prefs2.timezone).toBe('Europe/London');
    expect(prefs2.defaultPageSize).toBe(30);
  });

  it('should update and retrieve system configuration', async () => {
    // Get initial config
    const config1 = await backend.getSystemConfiguration();
    expect(config1.environment).toBe('development');

    // Update config
    await backend.updateSystemConfiguration({
      environment: 'staging',
      features: {
        queueManagement: true,
        autoProcessing: true,
        slaTracking: true,
        aiClassification: true
      }
    });

    // Get updated config
    const config2 = await backend.getSystemConfiguration();
    expect(config2.environment).toBe('staging');
    expect(config2.features.aiClassification).toBe(true);
  });
});

/**
 * Integration Tests
 */
describe('Settings API Integration', () => {
  it('should handle complete user preferences flow', async () => {
    const handler = createSettingsHandler(true);
    const email = 'integration@example.com';

    // 1. Get initial preferences (defaults)
    const request1 = createMockRequest(email);
    const initial = await handler.getUserPreferences(request1);
    expect(initial.timezone).toBe('America/New_York');

    // 2. Update preferences
    const request2 = createMockRequest(email, {
      timezone: 'America/Los_Angeles',
      defaultPageSize: 40,
      compactView: true
    });
    const updated = await handler.updateUserPreferences(request2);
    expect(updated.timezone).toBe('America/Los_Angeles');
    expect(updated.defaultPageSize).toBe(40);

    // 3. Get preferences again (should have updates)
    const request3 = createMockRequest(email);
    const retrieved = await handler.getUserPreferences(request3);
    expect(retrieved.timezone).toBe('America/Los_Angeles');
    expect(retrieved.defaultPageSize).toBe(40);

    // 4. Reset to defaults
    const request4 = createMockRequest(email);
    const reset = await handler.resetUserPreferences(request4);
    expect(reset.timezone).toBe('America/New_York');
    expect(reset.defaultPageSize).toBe(20);
    expect(reset.compactView).toBe(false);
  });

  it('should handle complete system configuration flow', async () => {
    const handler = createSettingsHandler(true);

    // 1. Get initial configuration
    const request1 = createMockRequest('admin@example.com');
    const initial = await handler.getSystemConfiguration(request1);
    expect(initial.features.aiClassification).toBe(false);

    // 2. Update configuration
    const request2 = createMockRequest('admin@example.com', {
      features: {
        queueManagement: true,
        autoProcessing: true,
        slaTracking: true,
        aiClassification: true
      },
      integrations: {
        openaiEnabled: true,
        openaiModel: 'gpt-4-turbo'
      }
    });
    const updated = await handler.updateSystemConfiguration(request2);
    expect(updated.features.aiClassification).toBe(true);
    expect(updated.integrations.openaiEnabled).toBe(true);

    // 3. Get configuration again (should have updates)
    const request3 = createMockRequest('admin@example.com');
    const retrieved = await handler.getSystemConfiguration(request3);
    expect(retrieved.features.aiClassification).toBe(true);
    expect(retrieved.integrations.openaiModel).toBe('gpt-4-turbo');
  });
});

/**
 * Validation Tests
 */
describe('Settings Validation', () => {
  it('should validate user preferences schema', () => {
    const validPrefs: UserPreferences = {
      email: 'test@example.com',
      timezone: 'America/New_York',
      notifyOnHighPriority: true,
      notifyOnSLABreach: true,
      dailySummaryEnabled: true,
      dailySummaryTime: '09:00',
      defaultPageSize: 20,
      defaultSort: { field: 'date', direction: 'desc' },
      compactView: false,
      autoArchiveCompleted: true,
      autoArchiveAfterDays: 30,
      slaHours: { high: 4, medium: 24, low: 72 }
    };

    expect(() => validate(userPreferencesSchema, validPrefs)).not.toThrow();
  });

  it('should reject invalid user preferences', () => {
    const invalidPrefs = {
      email: 'not-an-email', // Invalid email
      defaultPageSize: 150, // > 100
      dailySummaryTime: '25:00' // Invalid time
    };

    expect(() => validate(userPreferencesSchema, invalidPrefs)).toThrow();
  });

  it('should validate system configuration schema', () => {
    const validConfig: SystemConfiguration = {
      version: '1.0.0',
      environment: 'production',
      features: {
        queueManagement: true,
        autoProcessing: true,
        slaTracking: true,
        aiClassification: false
      },
      limits: {
        maxEmailsPerRun: 100,
        maxQueueSize: 1000,
        apiRateLimit: 100,
        sessionTimeout: 3600
      },
      integrations: {
        openaiEnabled: false,
        openaiModel: 'gpt-4'
      }
    };

    expect(() => validate(systemConfigurationSchema, validConfig)).not.toThrow();
  });

  it('should reject invalid system configuration', () => {
    const invalidConfig = {
      version: '1.0.0',
      environment: 'invalid-env', // Invalid environment
      features: {
        queueManagement: 'yes' // Should be boolean
      }
    };

    expect(() => validate(systemConfigurationSchema, invalidConfig)).toThrow();
  });
});

/**
 * Manual Testing Instructions
 *
 * To manually test the settings endpoints in deployed GAS:
 *
 * 1. Deploy as web app
 * 2. Get authentication token:
 *    POST https://your-deployment-url/api/auth/login
 *
 * 3. Get user preferences:
 *    GET https://your-deployment-url/api/settings/user
 *    Headers: Authorization: Bearer <token>
 *    Expected: UserPreferences object with defaults
 *
 * 4. Update user preferences:
 *    PUT https://your-deployment-url/api/settings/user
 *    Headers: Authorization: Bearer <token>
 *    Body: { "timezone": "Europe/London", "defaultPageSize": 30 }
 *    Expected: Updated UserPreferences
 *
 * 5. Reset user preferences:
 *    POST https://your-deployment-url/api/settings/user/reset
 *    Headers: Authorization: Bearer <token>
 *    Expected: UserPreferences with default values
 *
 * 6. Get default preferences (no auth required):
 *    GET https://your-deployment-url/api/settings/user/defaults
 *    Expected: Default UserPreferences
 *
 * 7. Get system configuration (admin only):
 *    GET https://your-deployment-url/api/settings/system
 *    Headers: Authorization: Bearer <admin-token>
 *    Expected: SystemConfiguration object
 *
 * 8. Update system configuration (admin only):
 *    PUT https://your-deployment-url/api/settings/system
 *    Headers: Authorization: Bearer <admin-token>
 *    Body: { "features": { "aiClassification": true } }
 *    Expected: Updated SystemConfiguration
 *
 * 9. Test error handling:
 *    - Try system endpoints without admin permission (should get 403)
 *    - Try with invalid data (should get validation error)
 *    - Try with invalid page size (> 100, should fail)
 *    - Try with invalid time format (should fail)
 */
