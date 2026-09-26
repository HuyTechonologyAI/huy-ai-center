import { runStepByStepMigration } from './data-migration-orchestrator.js';

try {
  const result = runStepByStepMigration();
  console.log('\n======================================================');
  console.log('MIGRATION EXECUTION FINISHED SUCCESSFULLY!');
  console.log(JSON.stringify(result, null, 2));
  console.log('======================================================\n');
  process.exit(0);
} catch (error) {
  console.error('\nMIGRATION ENCOUNTERED AN ERROR:', error);
  process.exit(1);
}
