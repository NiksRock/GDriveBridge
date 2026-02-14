import 'dotenv/config';

console.log('🚀 Starting GDriveBridge Worker...');

// Core transfer worker
import './queue/worker';

// Move mode verification
import './queue/verification.worker';

// Safe delete worker
import './queue/delete.worker';

// Quota resume worker
import './queue/quota-resume.worker';

/**
 * Global crash safety
 */
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception in Worker:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Promise Rejection in Worker:', reason);
  process.exit(1);
});
