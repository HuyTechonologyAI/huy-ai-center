import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function loadJson<T>(relativePath: string): T {
  const filePath = path.join(process.cwd(), relativePath);
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

describe('HUY AI V2 UI/UX Design System Tokens & Public Contract', () => {

  test('Design Tokens structure and completeness', () => {
    const tokens = loadJson<any>('config/ui/v2/design-tokens.json');
    assert.strictEqual(tokens.system, 'HUY AI Design System');
    assert.strictEqual(tokens.target_brand, 'HUY TECHNOLOGY AI GROUP');

    // Color tokens
    assert.ok(tokens.color.dark, 'Must include dark mode color palette');
    assert.ok(tokens.color.light, 'Must include light mode color palette');
    assert.ok(tokens.color.brand.primary, 'Must define primary brand color');
    assert.strictEqual(tokens.color.brand.primary, '#00E5FF');
    assert.ok(tokens.color.semantic.success, 'Must define semantic success color');

    // Typography tokens
    assert.ok(tokens.typography.families.display, 'Must define display font family');
    assert.ok(tokens.typography.families.body, 'Must define body font family');
    assert.ok(tokens.typography.families.mono, 'Must define mono font family');
    assert.ok(tokens.typography.sizes.base, 'Must define base font size');

    // Spacing and radii
    assert.ok(tokens.spacing['4'], 'Must define spacing scale');
    assert.ok(tokens.radii['full'], 'Must define radii');

    // Breakpoints
    assert.strictEqual(tokens.breakpoints.mobile, '390px');
    assert.strictEqual(tokens.breakpoints.tablet, '768px');
    assert.strictEqual(tokens.breakpoints.laptop, '1280px');
    assert.strictEqual(tokens.breakpoints.desktop, '1440px');

    // Motion and Elevation
    assert.ok(tokens.motion.durations.normal, 'Must define normal motion duration');
    assert.ok(tokens.elevation.glow_primary, 'Must define primary glow elevation');
  });

  test('Organization Brand Tokens match canonical 6 BUs exactly', () => {
    const orgTokens = loadJson<any>('config/ui/v2/organization-brand-tokens.json');
    const architectureOrgs = loadJson<any>('config/architecture/v2/organizations.json').organizations;

    const canonicalOrgIds = [
      'org-01-huytech',
      'org-02-aischool',
      'org-03-smarttax',
      'org-04-media-tech',
      'org-05-media-edu',
      'org-06-media-creative'
    ];

    assert.strictEqual(Object.keys(orgTokens.organizations).length, 6, 'Must contain exactly 6 organizations');
    assert.strictEqual(architectureOrgs.length, 6, 'Architecture orgs must also be 6');

    for (const orgId of canonicalOrgIds) {
      assert.ok(orgTokens.organizations[orgId], `Missing brand token definition for ${orgId}`);
      const org = orgTokens.organizations[orgId];
      assert.ok(org.display_name, `${orgId} must have display_name`);
      assert.ok(org.colors.primary, `${orgId} must have primary accent color`);
      assert.ok(org.colors.border, `${orgId} must have border color`);
      assert.ok(org.gradient, `${orgId} must have brand gradient`);
      assert.ok(org.logo.icon, `${orgId} must have an icon`);
    }

    // Ensure no media-tax exists
    assert.strictEqual(orgTokens.organizations['org-media-tax'], undefined);
  });

  test('Risk UI tokens cover R0 to R4 for Control Center handoff', () => {
    const orgTokens = loadJson<any>('config/ui/v2/organization-brand-tokens.json');
    const riskTokens = orgTokens.risk_ui_tokens;

    assert.ok(riskTokens, 'Must define risk_ui_tokens');
    const levels = ['R0', 'R1', 'R2', 'R3', 'R4'];
    for (let i = 0; i < levels.length; i++) {
      const code = levels[i];
      assert.ok(riskTokens[code], `Risk level ${code} must be defined`);
      assert.strictEqual(riskTokens[code].level, i, `Risk level ${code} must have level ${i}`);
      assert.ok(riskTokens[code].label, `Risk level ${code} must have a label`);
      assert.ok(riskTokens[code].badge_bg, `Risk level ${code} must have badge_bg`);
    }
  });

  test('Security & Confidentiality: Zero credentials or private schemas in UI configs', () => {
    const designTokensRaw = fs.readFileSync('config/ui/v2/design-tokens.json', 'utf-8');
    const orgTokensRaw = fs.readFileSync('config/ui/v2/organization-brand-tokens.json', 'utf-8');

    const forbiddenPatterns = [
      /postgres:\/\//i,
      /Bearer\s+/i,
      /service_role/i,
      /DATABASE_URL/i,
      /SUPABASE_SERVICE_ROLE_KEY/i,
      /secret/i,
      /private_key/i,
      /cost_ceiling_daily_usd/i
    ];

    for (const pattern of forbiddenPatterns) {
      assert.strictEqual(pattern.test(designTokensRaw), false, `Forbidden secret pattern found in design-tokens.json: ${pattern}`);
      assert.strictEqual(pattern.test(orgTokensRaw), false, `Forbidden secret pattern found in organization-brand-tokens.json: ${pattern}`);
    }
  });

  test('Public Ecosystem Data Contract validation', () => {
    const publicEcosystemData = loadJson<any>('config/architecture/v2/public-ecosystem.json');
    assert.strictEqual(publicEcosystemData.version, '2.0');
    assert.strictEqual(publicEcosystemData.public_ecosystem.length, 6);

    const requiredFields = [
      'id',
      'display_name',
      'short_description',
      'brand_role',
      'public_capabilities',
      'public_product_groups',
      'public_website_target',
      'public_status'
    ];

    for (const org of publicEcosystemData.public_ecosystem) {
      for (const field of requiredFields) {
        assert.ok(org[field], `Public ecosystem node ${org.id} missing field: ${field}`);
      }
      assert.ok(org.public_website_target.startsWith('https://'), `${org.id} URL must start with https://`);
      assert.strictEqual(org.public_status, 'ACTIVE', `${org.id} must be ACTIVE`);
      assert.ok(Array.isArray(org.public_capabilities) && org.public_capabilities.length > 0);
      assert.ok(Array.isArray(org.public_product_groups) && org.public_product_groups.length > 0);
    }
  });
});
