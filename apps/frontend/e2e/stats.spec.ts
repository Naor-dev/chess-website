import { test, expect } from '@playwright/test';

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

const MOCK_STATS_WITH_DATA = {
  success: true,
  data: {
    totalGames: 25,
    activeGames: 2,
    finishedGames: 23,
    wins: 14,
    losses: 7,
    draws: 2,
    winRate: 60.9,
    avgMovesPerGame: 32,
    currentStreak: { type: 'win', count: 3 },
    byDifficulty: [
      { level: 1, total: 5, wins: 5, losses: 0, draws: 0 },
      { level: 2, total: 8, wins: 6, losses: 1, draws: 1 },
      { level: 3, total: 7, wins: 3, losses: 3, draws: 1 },
      { level: 4, total: 3, wins: 0, losses: 3, draws: 0 },
    ],
    byTimeControl: [
      { type: 'blitz_5min', total: 10, wins: 6 },
      { type: 'rapid_10min', total: 8, wins: 5 },
      { type: 'none', total: 5, wins: 3 },
    ],
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
 * Mock stats API response via the proxy route.
 */
async function mockStats(
  page: import('@playwright/test').Page,
  statsResponse: typeof MOCK_EMPTY_STATS
) {
  await page.route('**/api/proxy/users/stats', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(statsResponse),
    })
  );
}

test.describe('Stats Page', () => {
  test('redirects unauthenticated user to home', async ({ page }) => {
    await mockUnauthenticated(page);
    await page.goto('/stats');

    // Should redirect to home page
    await expect(page).toHaveURL('/', { timeout: 5000 });
  });

  test('shows loading state', async ({ page }) => {
    await mockAuthenticated(page);

    // Delay stats response to observe loading state
    await page.route('**/api/proxy/users/stats', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_EMPTY_STATS),
      });
    });

    await page.goto('/stats');

    // Loading indicator should be visible
    await expect(page.getByText('Loading statistics...')).toBeVisible({ timeout: 3000 });
  });

  test('shows empty state CTA when user has no finished games', async ({ page }) => {
    await mockAuthenticated(page);
    await mockStats(page, MOCK_EMPTY_STATS);

    await page.goto('/stats');

    // Wait for loading to finish
    await expect(page.getByText('Loading statistics...')).not.toBeVisible({ timeout: 5000 });

    // Should show empty state message
    await expect(page.getByText('Play your first game to see statistics!')).toBeVisible();

    // Should show Start New Game link
    await expect(page.getByRole('link', { name: 'Start New Game' })).toBeVisible();

    // Overview cards should still show zeros
    await expect(page.getByText('Total Games')).toBeVisible();
  });

  test('shows stats with data including overview cards, results bar, charts', async ({ page }) => {
    await mockAuthenticated(page);
    await mockStats(page, MOCK_STATS_WITH_DATA);

    await page.goto('/stats');
    await expect(page.getByText('Loading statistics...')).not.toBeVisible({ timeout: 5000 });

    // Overview cards
    await expect(page.getByText('Total Games')).toBeVisible();
    await expect(page.getByText('25')).toBeVisible();
    await expect(page.getByText('Win Rate')).toBeVisible();
    await expect(page.getByText('60.9%').first()).toBeVisible();
    await expect(page.getByText('Avg. Moves')).toBeVisible();
    await expect(page.getByText('32')).toBeVisible();

    // Results section
    await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible();
    await expect(page.getByText('14 Wins')).toBeVisible();
    await expect(page.getByText('7 Losses')).toBeVisible();
    await expect(page.getByText('2 Draws')).toBeVisible();

    // Results bar with aria-label
    await expect(
      page.getByRole('img', { name: 'Results: 14 wins, 2 draws, 7 losses' })
    ).toBeVisible();

    // Difficulty chart
    await expect(page.getByRole('heading', { name: 'By Difficulty' })).toBeVisible();
    await expect(page.getByText('Beginner').first()).toBeVisible();
    await expect(page.getByText('Easy').first()).toBeVisible();
    await expect(page.getByText('Medium').first()).toBeVisible();
    await expect(page.getByText('Hard').first()).toBeVisible();

    // Time control chart
    await expect(page.getByRole('heading', { name: 'By Time Control' })).toBeVisible();
    await expect(page.getByText('5 min').first()).toBeVisible();
    await expect(page.getByText('10 min').first()).toBeVisible();
    await expect(page.getByText('No Clock').first()).toBeVisible();
  });

  test('Back to Home button navigates to home page', async ({ page }) => {
    await mockAuthenticated(page);
    await mockStats(page, MOCK_STATS_WITH_DATA);

    await page.goto('/stats');
    await expect(page.getByText('Loading statistics...')).not.toBeVisible({ timeout: 5000 });

    // Click back link
    await page.getByRole('link', { name: 'Back to Home' }).click();

    await expect(page).toHaveURL('/', { timeout: 5000 });
  });

  test('accessible data tables are present for screen readers', async ({ page }) => {
    await mockAuthenticated(page);
    await mockStats(page, MOCK_STATS_WITH_DATA);

    await page.goto('/stats');
    await expect(page.getByText('Loading statistics...')).not.toBeVisible({ timeout: 5000 });

    // sr-only tables should exist in the DOM (even though visually hidden)
    const resultsTable = page.locator('table', {
      has: page.locator('caption:text("Game Results Breakdown")'),
    });
    await expect(resultsTable).toBeAttached();
    await expect(resultsTable.locator('th:text("Result")')).toBeAttached();
    await expect(resultsTable.locator('td:text("Wins")')).toBeAttached();

    const difficultyTable = page.locator('table', {
      has: page.locator('caption:text("Performance by Difficulty Level")'),
    });
    await expect(difficultyTable).toBeAttached();
    await expect(difficultyTable.locator('th:text("Difficulty")')).toBeAttached();

    const timeControlTable = page.locator('table', {
      has: page.locator('caption:text("Games by Time Control")'),
    });
    await expect(timeControlTable).toBeAttached();
    await expect(timeControlTable.locator('th:text("Time Control")')).toBeAttached();
  });

  test('Start New Game button navigates to new game page', async ({ page }) => {
    await mockAuthenticated(page);
    await mockStats(page, MOCK_EMPTY_STATS);

    await page.goto('/stats');
    await expect(page.getByText('Loading statistics...')).not.toBeVisible({ timeout: 5000 });

    await page.getByRole('link', { name: 'Start New Game' }).click();
    await expect(page).toHaveURL('/game/new', { timeout: 5000 });
  });
});
