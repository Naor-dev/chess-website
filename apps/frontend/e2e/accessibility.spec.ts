import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Known axe-core violations that are tracked and will be fixed in later phases.
 * Each entry is an axe rule ID. Remove entries as violations are fixed.
 *
 * These are ONLY for pre-existing issues — new violations will still fail CI.
 */
const KNOWN_ISSUES: string[] = [
  // Will be populated after first run to baseline existing violations
];

const MOCK_USER = {
  success: true,
  data: {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      displayName: 'Test User',
    },
  },
};

const MOCK_EMPTY_GAMES = {
  success: true,
  data: { games: [] },
};

const MOCK_EMPTY_STATS = {
  success: true,
  data: {
    totalGames: 0,
    activeGames: 0,
    finishedGames: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    winRate: 0,
    avgMovesPerGame: 0,
    currentStreak: { type: 'none', count: 0 },
    byDifficulty: [],
    byTimeControl: [],
  },
};

/**
 * Mock authenticated user by intercepting the /api/auth/me route.
 */
async function mockAuthenticated(page: import('@playwright/test').Page) {
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_USER) })
  );
}

/**
 * Mock unauthenticated user.
 */
async function mockUnauthenticated(page: import('@playwright/test').Page) {
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, error: 'Not authenticated' }),
    })
  );
}

/**
 * Run axe-core analysis with WCAG 2.1 AA tags.
 * Excludes known issues from failure check while still reporting them.
 */
async function runAxeAnalysis(page: import('@playwright/test').Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  // Separate known vs new violations
  const newViolations = results.violations.filter((v) => !KNOWN_ISSUES.includes(v.id));
  const knownViolations = results.violations.filter((v) => KNOWN_ISSUES.includes(v.id));

  // Log known violations for awareness (not failures)
  if (knownViolations.length > 0) {
    console.log(
      `[axe] ${knownViolations.length} known violation(s) baselined:`,
      knownViolations.map((v) => v.id).join(', ')
    );
  }

  return { newViolations, knownViolations, allViolations: results.violations };
}

/**
 * Format axe violations into a readable string for test failure output.
 */
function formatViolations(violations: import('axe-core').Result[]): string {
  return violations
    .map((v) => {
      const nodes = v.nodes
        .slice(0, 3)
        .map((n) => `    - ${n.html.substring(0, 120)}`)
        .join('\n');
      const more = v.nodes.length > 3 ? `\n    ... and ${v.nodes.length - 3} more` : '';
      return `  [${v.impact}] ${v.id}: ${v.help}\n${nodes}${more}`;
    })
    .join('\n\n');
}

test.describe('Accessibility - axe-core WCAG 2.1 AA', () => {
  test('Home page (unauthenticated) has no new a11y violations', async ({ page }) => {
    await mockUnauthenticated(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const { newViolations } = await runAxeAnalysis(page);

    expect(
      newViolations,
      `New accessibility violations found:\n${formatViolations(newViolations)}`
    ).toHaveLength(0);
  });

  test('Home page (authenticated) has no new a11y violations', async ({ page }) => {
    await mockAuthenticated(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const { newViolations } = await runAxeAnalysis(page);

    expect(
      newViolations,
      `New accessibility violations found:\n${formatViolations(newViolations)}`
    ).toHaveLength(0);
  });

  test('New Game page has no new a11y violations', async ({ page }) => {
    await mockAuthenticated(page);
    await page.goto('/game/new');
    await page.waitForLoadState('networkidle');

    const { newViolations } = await runAxeAnalysis(page);

    expect(
      newViolations,
      `New accessibility violations found:\n${formatViolations(newViolations)}`
    ).toHaveLength(0);
  });

  test('History page has no new a11y violations', async ({ page }) => {
    await mockAuthenticated(page);
    // Mock the games list API
    await page.route('**/api/proxy/games**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_EMPTY_GAMES),
      })
    );

    await page.goto('/history');
    await page.waitForLoadState('networkidle');

    const { newViolations } = await runAxeAnalysis(page);

    expect(
      newViolations,
      `New accessibility violations found:\n${formatViolations(newViolations)}`
    ).toHaveLength(0);
  });

  test('Stats page has no new a11y violations', async ({ page }) => {
    await mockAuthenticated(page);
    await page.route('**/api/proxy/users/stats', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_EMPTY_STATS),
      })
    );

    await page.goto('/stats');
    await page.waitForLoadState('networkidle');

    const { newViolations } = await runAxeAnalysis(page);

    expect(
      newViolations,
      `New accessibility violations found:\n${formatViolations(newViolations)}`
    ).toHaveLength(0);
  });

  test('Auth error page has no new a11y violations', async ({ page }) => {
    await mockUnauthenticated(page);
    await page.goto('/auth/error');
    await page.waitForLoadState('networkidle');

    const { newViolations } = await runAxeAnalysis(page);

    expect(
      newViolations,
      `New accessibility violations found:\n${formatViolations(newViolations)}`
    ).toHaveLength(0);
  });
});
