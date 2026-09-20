const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://bdeluacbzbdflxubhpha.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZWx1YWNiemJkZmx4dWJocGhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEwMzUyNywiZXhwIjoyMDkzNjc5NTI3fQ.VVgu_yee1g-1KzA_3CoEzYluKFSzW5X7MSw5vruZm18'
);

const newTables = [
  'ai_tasks', 'ai_task_steps', 'ai_outputs',
  'nodes', 'node_heartbeats',
  'ai_providers', 'ai_models', 'tools', 'tool_versions', 'tool_capabilities',
  'agents', 'agent_versions',
  'github_projects', 'github_reviews', 'github_versions'
];

async function checkNewTables() {
  console.log('Checking status of the 15 target tables...');
  for (const table of newTables) {
    const { data, error } = await supabase.from(table).select('*').limit(0);
    if (error) {
      console.log(`❌ ${table}: ${error.message}`);
    } else {
      console.log(`✅ ${table}: table exists!`);
    }
  }
}

checkNewTables();
