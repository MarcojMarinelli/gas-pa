/**
 * Follow-up Queue System - Main Module
 *
 * Exports all queue-related components and functions.
 */

// Core components
export { FollowUpQueue } from './queue-manager';
export { SnoozeEngine } from './snooze-engine';
export { SLATracker } from './sla-tracker';

// Types
export * from './types';

// Default exports
import FollowUpQueueInstance from './queue-manager';
import SnoozeEngineInstance from './snooze-engine';
import SLATrackerInstance from './sla-tracker';

export default {
  FollowUpQueue: FollowUpQueueInstance,
  SnoozeEngine: SnoozeEngineInstance,
  SLATracker: SLATrackerInstance
};
