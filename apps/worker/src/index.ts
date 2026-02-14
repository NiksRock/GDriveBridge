import 'dotenv/config';

console.log('🚀 Starting GDriveBridge Worker...');

import './queue/worker';

/**
 * Global crash safety
 * Prevent silent worker death.
 */
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception in Worker:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Promise Rejection in Worker:', reason);
  process.exit(1);
});
