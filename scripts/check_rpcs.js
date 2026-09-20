const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://bdeluacbzbdflxubhpha.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZWx1YWNiemJkZmx4dWJocGhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEwMzUyNywiZXhwIjoyMDkzNjc5NTI3fQ.VVgu_yee1g-1KzA_3CoEzYluKFSzW5X7MSw5vruZm18'
);

async function check() {
  const list = [
    'exec', 'exec_sql', 'execute_sql', 'sql', 'query',
    'run_sql', 'match_knowledge_chunks', 'set_updated_at'
  ];

  for (const name of list) {
    const res = await supabase.rpc(name, {});
    console.log(`RPC ${name}: status=${res.status}, error=${res.error ? res.error.message : 'none'}`);
  }
}

check();
