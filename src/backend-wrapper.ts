/**
 * Backend Functions Entry Point for Google Apps Script
 * This file imports and re-exports all functions to the global scope
 */

import {
  simpleTest,
  authorizeScript,
  cleanupProperties,
  setup,
  testEmailProcessing,
  testDailySummary,
  getConfiguration,
  updateConfiguration,
  getStatistics,
  reprocessEmails,
  exportConfiguration
} from './main';

import {
  processEmailsPeriodically,
  sendDailySummary,
  sendWeeklySummary,
  cleanupOldData
} from './triggers/timeBased';

// Declare global type for GAS
declare var global: any;

// Get the global object (works in GAS)
const globalObj = (function() {
  // In GAS, 'this' at function scope refers to global
  return this || (typeof global !== 'undefined' ? global : {});
})();

// Export all functions to global scope
(globalObj as any).simpleTest = simpleTest;
(globalObj as any).authorizeScript = authorizeScript;
(globalObj as any).cleanupProperties = cleanupProperties;
(globalObj as any).setup = setup;
(globalObj as any).testEmailProcessing = testEmailProcessing;
(globalObj as any).testDailySummary = testDailySummary;
(globalObj as any).processEmailsPeriodically = processEmailsPeriodically;
(globalObj as any).sendDailySummary = sendDailySummary;
(globalObj as any).sendWeeklySummary = sendWeeklySummary;
(globalObj as any).cleanupOldData = cleanupOldData;
(globalObj as any).getConfiguration = getConfiguration;
(globalObj as any).updateConfiguration = updateConfiguration;
(globalObj as any).getStatistics = getStatistics;
(globalObj as any).reprocessEmails = reprocessEmails;
(globalObj as any).exportConfiguration = exportConfiguration;
