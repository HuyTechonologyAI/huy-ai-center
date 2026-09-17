-- Seed data for Dell Precision M4800 Primary Worker Node
INSERT INTO public.ai_worker_nodes (
    node_id,
    name,
    hostname,
    status,
    capabilities,
    max_concurrency,
    system_specs
) VALUES (
    'huy-ai-node-01',
    'Dell Precision M4800 Primary Node',
    'huy-ai-node-01',
    'offline',
    ARRAY['ollama', 'litellm', 'langflow', 'n8n'],
    2,
    '{"ramTotalBytes": 34359738368, "cpuCores": 8, "storageTotalBytes": 1000204886016, "os": "Ubuntu Server 24.04 LTS"}'::jsonb
) ON CONFLICT (node_id) DO NOTHING;
