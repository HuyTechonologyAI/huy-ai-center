import { runDisasterRecoveryWorkflow } from './runner.js';

runDisasterRecoveryWorkflow()
  .then(receipt => {
    console.log('\nWorkflow completed successfully!');
    console.log(JSON.stringify(receipt, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error('\nWorkflow failed with error:', err);
    process.exit(1);
  });
