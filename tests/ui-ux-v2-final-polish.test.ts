import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function readV2File(relativePortfolioPath: string): string {
  const portfolioDir = path.join(process.cwd(), '..', 'edtech-ai-portfolio');
  if (!fs.existsSync(portfolioDir)) {
    throw new Error(`DEPENDENCY_UNAVAILABLE: Sibling repository edtech-ai-portfolio not found at '${portfolioDir}'`);
  }
  const filePath = path.join(portfolioDir, relativePortfolioPath);
  return fs.readFileSync(filePath, 'utf-8');
}

describe('HUY AI AGENCY GROUP V2.0 — Phase 06J-UX-B.2 Final Polish Validation', () => {

  test('AI Agency Hierarchy Representation: Canonical Levels & Human Governance', () => {
    const content = readV2File('src/components/v2/AgentHierarchyDiagram.tsx');

    // 1. Human Governance MUST NOT receive Level 4 or any numerical level
    assert.doesNotMatch(
      content,
      /level:\s*["']Cấp 4["'].*Human Direction/s,
      'Human Governance must NOT be labeled as Level 4'
    );
    assert.doesNotMatch(
      content,
      /badge:\s*["']Level 4.*Human/i,
      'Human Governance must NOT receive Level 4 badge'
    );
    assert.match(content, /badge:\s*["']Human Governance["']/, 'Must define badge as Human Governance without numerical level');

    // 2. Canonical numerical levels for agent hierarchy
    assert.match(content, /badge:\s*["']Level 4 • Group AI["']/, 'Level 4 must be Group AI');
    assert.match(content, /badge:\s*["']Level 3 • Company AI["']/, 'Level 3 must be Company AI');
    assert.match(content, /badge:\s*["']Level 2 • Department AI["']/, 'Level 2 must be Department AI');
    assert.match(content, /badge:\s*["']Level 1 • Specialist AI["']/, 'Level 1 must be Specialist AI');
    assert.match(content, /badge:\s*["']Level 0 • Tools["']/, 'Level 0 must be Tools & Adapters');
  });

  test('Public Security Copy Abstraction: Zero internal technical jargon', () => {
    const secContent = readV2File('src/components/v2/SecurityGovernance.tsx');

    // Must NOT contain internal implementation details
    assert.doesNotMatch(secContent, /Row-Level Security/i, 'Must not mention Row-Level Security');
    assert.doesNotMatch(secContent, /RLS Matrix/i, 'Must not mention RLS Matrix');
    assert.doesNotMatch(secContent, /\bR3\b/, 'Must not mention internal risk code R3');
    assert.doesNotMatch(secContent, /\bR4\b/, 'Must not mention internal risk code R4');
    assert.doesNotMatch(secContent, /100% Vết kiểm toán/, 'Must not make 100% guarantee claim');
    assert.doesNotMatch(secContent, /Tuân thủ quy chuẩn/, 'Must not imply uncertified compliance');

    // Must contain customer-facing terms
    assert.match(secContent, /Phân Quyền Theo Phạm Vi Dữ Liệu/, 'Must use policy-based access term');
    assert.match(secContent, /Giám Sát Của Con Người \(Human-in-the-Loop\)/, 'Must use human oversight term');
    assert.match(secContent, /Quyền Hạn Tối Thiểu \(Least Privilege\)/, 'Must use least privilege term');
    assert.match(secContent, /Nhật Ký & Khả Năng Truy Vết \(Auditability\)/, 'Must use auditability term');
    assert.match(secContent, /Nguyên tắc thiết kế/, 'Must use design principle badge');
  });

  test('Legacy Shell Isolation: /v2 route isolated from legacy navigation and widgets', () => {
    const layoutContent = readV2File('src/app/layout.tsx');
    const wrapperContent = readV2File('src/components/LegacyShellWrapper.tsx');

    // Root layout uses LegacyShellWrapper
    assert.match(layoutContent, /<LegacyShellWrapper>/, 'Root layout must wrap children in LegacyShellWrapper');

    // LegacyShellWrapper suppresses legacy chrome for /v2
    assert.match(wrapperContent, /isV2\s*=\s*pathname\?\.startsWith\(["']\/v2["']\)/, 'Must detect /v2 route');
    assert.match(wrapperContent, /if\s*\(isV2\)\s*\{\s*return\s*<>{children}<\/>;\s*\}/, 'Must return pure children on /v2 without legacy chrome');
  });

  test('Founder Verified Credentials & Exact Awards', () => {
    const founderContent = readV2File('src/components/v2/FounderSection.tsx');

    // Name & Background
    assert.match(founderContent, /Ngô Quốc Huy/, 'Founder name must be Ngô Quốc Huy');
    assert.match(founderContent, /ĐH Sư Phạm Kỹ Thuật TP\.HCM/, 'Must mention SPKT mechanical engineering');

    // Verified Award 1
    assert.match(
      founderContent,
      /Người thợ trẻ giỏi toàn quốc.*2020.*Trung ương Đoàn TNCS Hồ Chí Minh/s,
      'Must preserve Người thợ trẻ giỏi toàn quốc (2020) exactly'
    );

    // Verified Award 2
    assert.match(
      founderContent,
      /Khởi nghiệp Đổi mới Sáng tạo OCOP.*Đồng Nai.*2020/s,
      'Must preserve Giải Nhất Khởi nghiệp ĐMST OCOP Đồng Nai (2020) exactly'
    );
  });

  test('Zero Infrastructure & Internal Topology Exposure in V2 Components', () => {
    const v2Dir = path.join(process.cwd(), '..', 'edtech-ai-portfolio', 'src', 'components', 'v2');
    const files = fs.readdirSync(v2Dir).filter((f) => f.endsWith('.tsx'));

    const forbiddenTerms = [
      'ai-jobs',
      'PGMQ',
      'huy-ai-node-01',
      'Dell M4800',
      'bdeluacbzbdflxubhpha',
      '9090',
      '5678',
      '11434'
    ];

    for (const file of files) {
      const filePath = path.join(v2Dir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      for (const term of forbiddenTerms) {
        assert.doesNotMatch(
          content,
          new RegExp(`\\b${term}\\b`, 'i'),
          `V2 component ${file} must not expose internal infrastructure term: ${term}`
        );
      }
    }
  });

});
