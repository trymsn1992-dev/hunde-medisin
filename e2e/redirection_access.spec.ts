import { test, expect } from '@playwright/test';

test.describe('Redirection and Access Control', () => {

    // Helper to log in
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.getByPlaceholder('navn@eksempel.no').fill('test@bjeffer.no');
        await page.getByPlaceholder('Passord').fill('password123');
        await page.getByRole('button', { name: 'Logg inn', exact: true }).click();
        await page.waitForURL('**/dashboard');
    });

    test('should redirect to /new-dog if user has no dogs', async ({ page }) => {
        // Mock the dogs fetch to return empty list
        await page.route('**/rest/v1/dogs*', async route => {
            const method = route.request().method();
            if (method === 'GET') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([])
                });
            } else {
                await route.continue();
            }
        });

        // Navigate to dashboard
        await page.goto('/dashboard');

        // Should be redirected to /new-dog
        await expect(page).toHaveURL(/\/new-dog/);
    });

    test('should redirect to /dashboard if accessing invalid dog id', async ({ page }) => {
        const randomId = '00000000-0000-0000-0000-000000000000'; // Non-existent ID

        // Navigate to a random dog page
        await page.goto(`/dog/${randomId}`);

        // The page logic should catch the error/null and redirect to dashboard
        // Note: The dashboard itself might then redirect to /new-dog if mocks are still active (but they aren't here unless I set them)
        // Or if the user has dogs (which test@bjeffer.no does), they stay on dashboard.

        // We expect eventual URL to be /dashboard (or specific dog if dashboard redirects to first dog, but default dashboard is list)
        // Let's wait for URL to NOT be the dog URL
        await expect(page).not.toHaveURL(new RegExp(`/dog/${randomId}`));

        // It should probably go to /dashboard
        await expect(page).toHaveURL(/\/dashboard/);
    });
});
