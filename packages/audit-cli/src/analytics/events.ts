/**
 * Analytics event types for Audit CLI
 * Centralized constants to prevent typos and enable type safety
 */

/**
 * Event type prefixes by command
 */
export const ANALYTICS_PREFIX = {
  RUN: 'audit.run',
  LIST_CHECKS: 'audit.list-checks',
  SHOW: 'audit.show',
  CLEAN: 'audit.clean',
} as const;

/**
 * Event lifecycle suffixes
 */
export const ANALYTICS_SUFFIX = {
  STARTED: 'started',
  FINISHED: 'finished',
} as const;

/**
 * Audit analytics event types
 */
export const ANALYTICS_EVENTS = {
  // Run events
  RUN_STARTED: `${ANALYTICS_PREFIX.RUN}.${ANALYTICS_SUFFIX.STARTED}`,
  RUN_FINISHED: `${ANALYTICS_PREFIX.RUN}.${ANALYTICS_SUFFIX.FINISHED}`,

  // List checks events
  LIST_CHECKS_STARTED: `${ANALYTICS_PREFIX.LIST_CHECKS}.${ANALYTICS_SUFFIX.STARTED}`,
  LIST_CHECKS_FINISHED: `${ANALYTICS_PREFIX.LIST_CHECKS}.${ANALYTICS_SUFFIX.FINISHED}`,

  // Show events
  SHOW_STARTED: `${ANALYTICS_PREFIX.SHOW}.${ANALYTICS_SUFFIX.STARTED}`,
  SHOW_FINISHED: `${ANALYTICS_PREFIX.SHOW}.${ANALYTICS_SUFFIX.FINISHED}`,

  // Clean events
  CLEAN_STARTED: `${ANALYTICS_PREFIX.CLEAN}.${ANALYTICS_SUFFIX.STARTED}`,
  CLEAN_FINISHED: `${ANALYTICS_PREFIX.CLEAN}.${ANALYTICS_SUFFIX.FINISHED}`,
} as const;

/**
 * Type helper for analytics event types
 */
export type AnalyticsEventType = typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS];

/**
 * Actor configuration for Audit analytics
 */
export const ANALYTICS_ACTOR = {
  type: 'agent' as const,
  id: 'audit-cli',
} as const;

