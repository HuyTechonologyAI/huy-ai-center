-- ============================================================================
-- PHASE 06K-B: MULTI-ORG MIGRATION DRAFT (004 - REFERENCE SEED)
-- Document Reference: V2_DEPARTMENT_REGISTRY.md / Sections 5, 6, 7, 18, 19
-- Status: Additive, Idempotent, Safe Dry-Run Draft
-- ============================================================================

-- 1. Canonical Organizations (Exactly 6)
INSERT INTO public.organizations (id, name, code, cost_center_code, role_description, parent_org_id, status, data_classification_ceiling)
VALUES
    ('org-01-huytech', 'HUY TECHNOLOGY AI GROUP', 'HUYTECH', 'CC-01-HUYTECH', 'Group Holding, Core Infrastructure & Strategic Orchestration', NULL, 'ACTIVE', 'RESTRICTED'),
    ('org-02-aischool', 'GVCNCDSAI AI SCHOOL', 'AISCHOOL', 'CC-02-AISCHOOL', 'National Education & MOET-Aligned Pedagogical AI Systems', 'org-01-huytech', 'ACTIVE', 'CONFIDENTIAL'),
    ('org-03-smarttax', 'SMARTTAX AI', 'SMARTTAX', 'CC-03-SMARTTAX', 'Enterprise Tax, Accounting & Compliance AI with Hermetic Isolation', 'org-01-huytech', 'ACTIVE', 'RESTRICTED'),
    ('org-04-media-tech', 'HUY TECH MEDIA', 'MEDIA_TECH', 'CC-04-MEDIA-TECH', 'Developer-Focused Technical Content, Architecture Diagrams & Tutorials', 'org-01-huytech', 'ACTIVE', 'INTERNAL'),
    ('org-05-media-edu', 'GVCNCDSAI MEDIA', 'MEDIA_EDU', 'CC-05-MEDIA-EDU', 'Teacher & Student Education Media, Video & Community Outreach', 'org-01-huytech', 'ACTIVE', 'INTERNAL'),
    ('org-06-media-creative', 'HUY CREATIVE MEDIA', 'MEDIA_CREATIVE', 'CC-06-MEDIA-CREATIVE', 'Viral Content, Creative Audio/Music, Visual Effects & Short-Form Media', 'org-01-huytech', 'ACTIVE', 'INTERNAL')
ON CONFLICT (id) DO NOTHING;

-- 2. Canonical Departments (Exactly 65)
INSERT INTO public.departments (id, organization_id, code, name, description, status)
VALUES
    -- Org 01: HUY TECHNOLOGY AI GROUP (10 departments)
    ('dept-01-executive', 'org-01-huytech', 'EXECUTIVE', 'Executive AI Office', 'Holding OKR planning, multi-org task synthesis', 'ACTIVE'),
    ('dept-01-engineering', 'org-01-huytech', 'ENGINEERING', 'AI Engineering', 'Agent harness development, MCP tools, SDKs', 'ACTIVE'),
    ('dept-01-infra', 'org-01-huytech', 'INFRA', 'Infrastructure Operations', 'Node management, Traefik, tunnel, hardware', 'ACTIVE'),
    ('dept-01-security', 'org-01-huytech', 'SECURITY', 'Cybersecurity & Governance', 'Key rotation, RLS audits, policy linters', 'ACTIVE'),
    ('dept-01-cost', 'org-01-huytech', 'COST', 'AI Finance & Cost Control', 'Token metering, cost center spend caps', 'ACTIVE'),
    ('dept-01-business', 'org-01-huytech', 'BUSINESS', 'Business Development', 'Enterprise partnerships and packaging', 'ACTIVE'),
    ('dept-01-qa', 'org-01-huytech', 'QA', 'Quality Assurance', 'E2E synthetic testing and evaluation', 'ACTIVE'),
    ('dept-01-rnd', 'org-01-huytech', 'RND', 'GitHub Radar & R&D', 'Open-source surveillance and prototyping', 'ACTIVE'),
    ('dept-01-media-coordination', 'org-01-huytech', 'MEDIA_COORD', 'Group Media Coordination', 'Cross-agency synchronization', 'ACTIVE'),
    ('dept-01-customer-success', 'org-01-huytech', 'CS', 'Customer Success', 'Incident triage and feedback escalation', 'ACTIVE'),

    -- Org 02: GVCNCDSAI AI SCHOOL (12 departments)
    ('dept-02-academic', 'org-02-aischool', 'ACADEMIC', 'Academic Affairs', 'MOET curriculum alignment (CV 5512)', 'ACTIVE'),
    ('dept-02-curriculum', 'org-02-aischool', 'CURRICULUM', 'Curriculum Development', 'Multi-grade syllabus structuring', 'ACTIVE'),
    ('dept-02-lesson-design', 'org-02-aischool', 'LESSON_DESIGN', 'Lesson Design', 'Automated lesson plans and pacing', 'ACTIVE'),
    ('dept-02-teacher-copilot', 'org-02-aischool', 'TEACHER_COPILOT', 'Teacher Copilot', 'Classroom management and rubric tools', 'ACTIVE'),
    ('dept-02-student-tutor', 'org-02-aischool', 'STUDENT_TUTOR', 'Student Tutor', 'Socratic tutoring and homework hints', 'ACTIVE'),
    ('dept-02-assessment', 'org-02-aischool', 'ASSESSMENT', 'Assessment', 'Formative grading and diagnostic tests', 'ACTIVE'),
    ('dept-02-question-bank', 'org-02-aischool', 'QUESTION_BANK', 'Question Bank', 'Bloom-aligned test item generation', 'ACTIVE'),
    ('dept-02-multimedia', 'org-02-aischool', 'MULTIMEDIA', 'Multimedia Learning', 'Interactive slides and conceptual mindmaps', 'ACTIVE'),
    ('dept-02-student-services', 'org-02-aischool', 'STUDENT_SERVICES', 'Student Services', 'Student queries and study cohorts', 'ACTIVE'),
    ('dept-02-certification', 'org-02-aischool', 'CERTIFICATION', 'Certificate Management', 'Digital tamper-evident credentials', 'ACTIVE'),
    ('dept-02-research', 'org-02-aischool', 'RESEARCH', 'Education Research', 'Pedagogical cognitive science', 'ACTIVE'),
    ('dept-02-qa', 'org-02-aischool', 'QA', 'Education QA', 'Pedagogical fact-checking and validation', 'ACTIVE'),

    -- Org 03: SMARTTAX AI (10 departments)
    ('dept-03-source-collection', 'org-03-smarttax', 'SOURCE_COLLECTION', 'Legal Source Collection', 'Official Gazette ingestion, circular parsing', 'ACTIVE'),
    ('dept-03-tax-research', 'org-03-smarttax', 'TAX_RESEARCH', 'Tax Research', 'Corporate Income Tax, VAT, depreciation', 'ACTIVE'),
    ('dept-03-legal-research', 'org-03-smarttax', 'LEGAL_RESEARCH', 'Legal Research', 'Enterprise law, contract dispute precedents', 'ACTIVE'),
    ('dept-03-citation', 'org-03-smarttax', 'CITATION', 'Citation Verification', 'Deterministic article cross-referencing', 'ACTIVE'),
    ('dept-03-document-drafting', 'org-03-smarttax', 'DOC_DRAFTING', 'Document Drafting', 'Explanation letters, contract drafting', 'ACTIVE'),
    ('dept-03-compliance', 'org-03-smarttax', 'COMPLIANCE', 'Compliance', 'Filing deadlines, regulatory alerts', 'ACTIVE'),
    ('dept-03-client-intake', 'org-03-smarttax', 'CLIENT_INTAKE', 'Client Intake', 'Client document triage, PII anonymization', 'ACTIVE'),
    ('dept-03-legal-qa', 'org-03-smarttax', 'LEGAL_QA', 'Legal QA', 'Legal opinion verification and liability check', 'ACTIVE'),
    ('dept-03-tax-qa', 'org-03-smarttax', 'TAX_QA', 'Tax QA', 'Mathematical calculation and formula audit', 'ACTIVE'),
    ('dept-03-human-review', 'org-03-smarttax', 'HUMAN_REVIEW', 'Human Expert Review', 'Licensed CPA & Attorney review gateway', 'ACTIVE'),

    -- Org 04: HUY TECH MEDIA (11 departments)
    ('dept-04-trends', 'org-04-media-tech', 'TRENDS', 'Tech Trends', 'Developer keyword research & market analysis', 'ACTIVE'),
    ('dept-04-strategy', 'org-04-media-tech', 'STRATEGY', 'Tech Content Strategy', 'Narrative structure and content calendar', 'ACTIVE'),
    ('dept-04-script', 'org-04-media-tech', 'SCRIPT', 'Tech Scriptwriting', 'Developer tutorials, tech breakdowns', 'ACTIVE'),
    ('dept-04-factcheck', 'org-04-media-tech', 'FACTCHECK', 'Tech Fact-Checking', 'Technical syntax and architecture check', 'ACTIVE'),
    ('dept-04-design', 'org-04-media-tech', 'DESIGN', 'Tech Graphic Design', 'Architecture diagrams, code infographics', 'ACTIVE'),
    ('dept-04-video', 'org-04-media-tech', 'VIDEO', 'Tech Video Production', 'Screen recordings, motion composition', 'ACTIVE'),
    ('dept-04-audio', 'org-04-media-tech', 'AUDIO', 'Tech Audio & Voiceover', 'Voice synthesis, technical narration', 'ACTIVE'),
    ('dept-04-edit', 'org-04-media-tech', 'EDIT', 'Tech Video Editing', 'Video assembly, transitions, rendering', 'ACTIVE'),
    ('dept-04-brand', 'org-04-media-tech', 'BRAND', 'Tech Brand Review', 'Tech media brand book compliance', 'ACTIVE'),
    ('dept-04-publishing', 'org-04-media-tech', 'PUBLISHING', 'Tech Publishing', 'YouTube, web, and social syndication', 'ACTIVE'),
    ('dept-04-analytics', 'org-04-media-tech', 'ANALYTICS', 'Tech Audience Analytics', 'Retention metrics and engagement analytics', 'ACTIVE'),

    -- Org 05: GVCNCDSAI MEDIA (11 departments)
    ('dept-05-trends', 'org-05-media-edu', 'TRENDS', 'Education Trends', 'EdTech trend research and classroom demands', 'ACTIVE'),
    ('dept-05-strategy', 'org-05-media-edu', 'STRATEGY', 'Education Content Strategy', 'Teacher growth campaigns, STEM planning', 'ACTIVE'),
    ('dept-05-script', 'org-05-media-edu', 'SCRIPT', 'Education Scriptwriting', 'Pedagogical stories, student guide scripts', 'ACTIVE'),
    ('dept-05-factcheck', 'org-05-media-edu', 'FACTCHECK', 'Education Fact-Checking', 'Curriculum alignment and accuracy check', 'ACTIVE'),
    ('dept-05-design', 'org-05-media-edu', 'DESIGN', 'Education Visual Design', 'Educational posters, classroom infographics', 'ACTIVE'),
    ('dept-05-video', 'org-05-media-edu', 'VIDEO', 'Education Video Production', 'Classroom demo and lecture videos', 'ACTIVE'),
    ('dept-05-audio', 'org-05-media-edu', 'AUDIO', 'Education Audio & Voiceover', 'Empathetic teacher narration, podcasts', 'ACTIVE'),
    ('dept-05-edit', 'org-05-media-edu', 'EDIT', 'Education Video Editing', 'Pedagogical video pacing and rendering', 'ACTIVE'),
    ('dept-05-brand', 'org-05-media-edu', 'BRAND', 'Education Brand Review', 'Teacher community brand voice review', 'ACTIVE'),
    ('dept-05-publishing', 'org-05-media-edu', 'PUBLISHING', 'Education Publishing', 'Multi-channel education syndication', 'ACTIVE'),
    ('dept-05-analytics', 'org-05-media-edu', 'ANALYTICS', 'Education Audience Analytics', 'Teacher engagement and feedback analytics', 'ACTIVE'),

    -- Org 06: HUY CREATIVE MEDIA (11 departments)
    ('dept-06-trends', 'org-06-media-creative', 'TRENDS', 'Creative Trends', 'Viral audio, sound, and shorts culture', 'ACTIVE'),
    ('dept-06-strategy', 'org-06-media-creative', 'STRATEGY', 'Creative Content Strategy', 'Entertainment narrative campaign design', 'ACTIVE'),
    ('dept-06-script', 'org-06-media-creative', 'SCRIPT', 'Creative Scriptwriting', 'Engaging hooks, lyrics, and short scripts', 'ACTIVE'),
    ('dept-06-factcheck', 'org-06-media-creative', 'FACTCHECK', 'Creative Fact-Checking', 'Context and lifestyle safety review', 'ACTIVE'),
    ('dept-06-design', 'org-06-media-creative', 'DESIGN', 'Creative Visual Design', 'Creative thumbnails, stylized album art', 'ACTIVE'),
    ('dept-06-video', 'org-06-media-creative', 'VIDEO', 'Creative Video Production', 'Motion visualizer, music video cuts', 'ACTIVE'),
    ('dept-06-audio', 'org-06-media-creative', 'AUDIO', 'Creative Audio & Music', 'AI music composition, audio stems', 'ACTIVE'),
    ('dept-06-edit', 'org-06-media-creative', 'EDIT', 'Creative Video Editing', 'Dynamic beat-sync editing and effects', 'ACTIVE'),
    ('dept-06-brand', 'org-06-media-creative', 'BRAND', 'Creative Brand Review', 'Copyright safety and platform clearance', 'ACTIVE'),
    ('dept-06-publishing', 'org-06-media-creative', 'PUBLISHING', 'Creative Publishing', 'TikTok, Reels, Shorts distribution', 'ACTIVE'),
    ('dept-06-analytics', 'org-06-media-creative', 'ANALYTICS', 'Creative Audience Analytics', 'Sound virality and audience reach', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- 3. Proposed Baseline AI Policies (Section 19: PROPOSED_06K_B)
-- Documented in docs/architecture/06K_B_POLICY_SEED_PROPOSAL.md
INSERT INTO public.ai_policies (id, name, policy_scope, target_id, rules, priority, status, metadata)
VALUES
    (
        'pol-group-global-ceiling',
        'Group Global Ceiling Policy',
        'GROUP',
        'org-01-huytech',
        '{"max_risk_level": 4, "require_human_gate_above_risk": 2, "disallowed_cross_org_egress": ["org-03-smarttax"]}'::jsonb,
        10,
        'ACTIVE',
        '{"proposal_status": "PROPOSED_06K_B"}'::jsonb
    ),
    (
        'pol-org-03-smarttax-isolation',
        'SmartTax Hermetic Isolation Boundary',
        'ORGANIZATION',
        'org-03-smarttax',
        '{"zero_raw_egress": true, "sanitized_public_only": true, "disallowed_external_domains": ["*"]}'::jsonb,
        1,
        'ACTIVE',
        '{"proposal_status": "PROPOSED_06K_B"}'::jsonb
    ),
    (
        'pol-group-media-outbound',
        'Media Agencies Outbound Policy',
        'GROUP',
        'org-01-huytech',
        '{"allowed_publish_classifications": ["PUBLIC"], "require_brand_review": true}'::jsonb,
        50,
        'ACTIVE',
        '{"proposal_status": "PROPOSED_06K_B"}'::jsonb
    )
ON CONFLICT (id) DO NOTHING;
