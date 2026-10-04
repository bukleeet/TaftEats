const { test, expect } = require('@playwright/test');
const path = require('node:path');
const axePath = require.resolve('axe-core/axe.min.js');
const password = 'TaftEats demo passphrase!';
async function login(page, username) {
  await page.goto('/login');
  await page.getByLabel('Username', { exact: true }).fill(username);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/establishments$/);
}
async function audit(page) {
  // Browser test fixture injection does not reflect app execution; axe evaluates the rendered DOM.
  await page.evaluate(require('node:fs').readFileSync(axePath, 'utf8'));
  const violations = await page.evaluate(async () => {
    const result = await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
    });
    return result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => n.target),
    }));
  });
  expect(violations).toEqual([]);
}
async function heroDescriptionOffset(page) {
  return page.locator('.hero-description').evaluate((description) => {
    return (
      description.getBoundingClientRect().top -
      description.closest('.hero').getBoundingClientRect().top
    );
  });
}
test('discovery, filtering, keyboard navigation, themes, and responsive layouts', async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/establishments');
  await page.evaluate(() => {
    localStorage.setItem('theme', 'light');
  });
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('Are you hungry?');
  await expect(page.locator('.hero-background')).toBeVisible();
  expect(
    await page.locator('.hero-background').evaluate((img) => img.complete && img.naturalWidth > 0),
  ).toBe(true);
  await expect(page.locator('.restaurant-card .star-display')).toHaveCount(10);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
  const initialDescription = await heroDescriptionOffset(page);
  await expect(page.locator('#hero-text')).toHaveAttribute('lang', 'fil', { timeout: 7000 });
  await expect(page.locator('#hero-text')).toHaveText('Gutom ka na ba?', { timeout: 3000 });
  expect(await heroDescriptionOffset(page)).toBe(initialDescription);
  await expect(page.locator('#hero-text em')).toHaveText('Gutom');
  await page.getByRole('button', { name: 'Pause animation', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume animation', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await audit(page);
  await page.screenshot({ path: path.resolve('docs/desktop-preview.png'), fullPage: true });
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await audit(page);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await page.getByRole('searchbox').fill('prelude');
  await page.getByRole('button', { name: 'Explore', exact: true }).click();
  await expect(page.locator('.restaurant-card')).toHaveCount(1);
  await page.getByRole('searchbox').fill('not a restaurant');
  await page.getByRole('button', { name: 'Explore', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No places match just yet.' })).toBeVisible();
  await page.getByRole('link', { name: 'Clear filters' }).click();
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 320, height: 844 });
  await page.reload();
  const mobileDescription = await heroDescriptionOffset(page);
  for (const phrase of [
    'Are you hungry?',
    'Gutom ka na ba?',
    '¿Tienes hambre?',
    '你饿了吗',
    'Vous avez faim?',
    'Hast du Hunger?',
    'Hai fame?',
  ]) {
    await expect(page.locator('#hero-text')).toHaveText(phrase, { timeout: 7000 });
    expect(await heroDescriptionOffset(page)).toBe(mobileDescription);
    const heading = await page.locator('.hero h1').boundingBox();
    const hero = await page.locator('.hero').boundingBox();
    expect(heading.x).toBeGreaterThanOrEqual(hero.x);
    expect(heading.x + heading.width).toBeLessThanOrEqual(hero.x + hero.width);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('#hero-text')).toHaveText('Are you hungry?');
  await expect(page.locator('.hero-animation-toggle')).toBeHidden();
  await expect(page.locator('#hero-text em')).toHaveText('hungry?');
  await audit(page);
  await page.screenshot({ path: path.resolve('docs/mobile-preview.png'), fullPage: true });
  expect(errors).toEqual([]);
});
test('registration, sign-in, profile edit, review CRUD, voting, and owner replies', async ({
  page,
  browser,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const username = `browser_${Date.now()}`;
  await page.goto('/login');
  await page.getByLabel('Username', { exact: true }).fill('invalid username');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Username must be');
  await expect(page.getByRole('alert')).toBeFocused();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  await audit(page);
  await page.goto('/register');
  await audit(page);
  await page.getByLabel('Username', { exact: true }).fill('jane_d');
  await page.getByLabel('Email', { exact: true }).fill(`${username}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Join the table' }).press('Enter');
  const registrationError = page.getByRole('alert');
  await expect(registrationError).toHaveText('Username or email already taken.');
  await expect(registrationError).toBeFocused();
  await expect(page.getByLabel('Username', { exact: true })).toHaveValue('jane_d');
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue(`${username}@example.test`);
  await expect(page.getByRole('button', { name: 'Join the table' })).toBeEnabled();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Join the table' })).toBeFocused();
  await audit(page);
  await page.getByLabel('Username', { exact: true }).fill(username);
  await page.getByLabel('Email', { exact: true }).fill(`${username}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Join the table' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await audit(page);
  await login(page, username);
  await page.getByRole('link', { name: username, exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'No reviews yet' })).toBeVisible();
  await page.getByRole('link', { name: 'Edit profile' }).click();
  await page.getByLabel('Bio', { exact: true }).fill('Coffee and honest reviews.');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByText('Coffee and honest reviews.', { exact: true })).toBeVisible();
  await page.goto('/establishments/69a95a4dabf2603b58236914/reviews');
  await audit(page);
  await page.getByLabel('Your headline').fill('Browser verified meal');
  await page.getByLabel('Your rating').selectOption('4.5');
  await page
    .locator('[data-rich-editor]')
    .fill('A thoughtful review written through the real browser.');
  await page.getByRole('button', { name: 'Publish review' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Browser verified meal');
  const reviewUrl = page.url();
  await audit(page);
  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  await login(ownerPage, 'owner_prelude');
  await ownerPage.goto(reviewUrl);
  await ownerPage.getByLabel('Your reply').fill('Thank you for stopping by!');
  await ownerPage.getByRole('button', { name: 'Post reply' }).click();
  await expect(
    ownerPage
      .locator('.thread-message .rich-text')
      .filter({ hasText: 'Thank you for stopping by!' }),
  ).toBeVisible();
  await ownerPage.getByRole('button', { name: /Helpful · 0/, exact: true }).click();
  await expect(ownerPage.getByRole('button', { name: 'Helpful · 1', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.reload();
  await page.getByLabel('Your reply').fill('Would come back again.');
  await page.getByRole('button', { name: 'Post reply' }).click();
  await expect(
    page.locator('.thread-message .rich-text').filter({ hasText: 'Would come back again.' }),
  ).toBeVisible();
  await page.getByText('Edit your review', { exact: true }).click();
  await page.getByLabel('Your headline').fill('Updated browser meal');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Updated browser meal');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete review', exact: true }).click();
  await expect(page).toHaveURL(/\/establishments\/.*\/reviews$/);
  expect(errors).toEqual([]);
  await ownerContext.close();
});
test('profiles and about pages render without accessibility violations', async ({ page }) => {
  await page.goto('/profile/000000000000000000000001');
  await expect(page.locator('#activity-status')).toContainText(
    'reviews shared with the community.',
  );
  await audit(page);
  await page.goto('/about');
  await audit(page);
});

test('card hit areas and current-page navigation work with pointer and keyboard input', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/establishments');
  const navigation = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(navigation.getByRole('link', { name: 'Discover', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(navigation.locator('[aria-current="page"]')).toHaveCount(1);
  const controls = await navigation
    .locator('.brand, .nav-links a, .nav-actions > a, .nav-actions button')
    .evaluateAll((elements) =>
      elements.map((element) => {
        const box = element.getBoundingClientRect();
        return { height: box.height, center: box.y + box.height / 2 };
      }),
    );
  for (const control of controls) {
    expect(control.height).toBe(44);
    expect(Math.abs(control.center - controls[0].center)).toBeLessThan(1);
  }
  const card = page.locator('.restaurant-card').first();
  const destination = await card.getByRole('link').getAttribute('href');
  await expect(card.getByRole('link')).toHaveCount(1);
  await card.locator('.card-content > p').click();
  await expect(page).toHaveURL(destination);
  await expect(navigation.getByRole('link', { name: 'Discover', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await page.goto('/establishments');
  await card.locator('.card-arrow').click();
  await expect(page).toHaveURL(destination);
  await page.goto('/establishments');
  await card.getByRole('link').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('.restaurant-card').nth(1).getByRole('link')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/establishments\/.*\/reviews$/);
  await navigation.getByRole('link', { name: 'Community', exact: true }).click();
  await expect(navigation.getByRole('link', { name: 'Community', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await navigation.getByRole('link', { name: 'Our story', exact: true }).click();
  await expect(navigation.getByRole('link', { name: 'Our story', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  const width = await page
    .locator('.about-page')
    .evaluate((element) => element.getBoundingClientRect().width);
  expect(width).toBe(1200);
  await expect(page.getByRole('link', { name: 'Visit the original CCAPDEV site' })).toHaveAttribute(
    'href',
    'https://taft-eats.vercel.app',
  );
  await expect(page.getByRole('link', { name: "Bullet's portfolio" })).toHaveAttribute(
    'href',
    'https://buklet.vercel.app',
  );
  await expect(page.locator('.about-origin')).toContainText('developed and maintained by Bullet');
  await page.screenshot({ path: path.resolve('.cache/ui/about-desktop.png'), fullPage: true });
  for (const viewportWidth of [320, 768, 1280]) {
    await page.setViewportSize({ width: viewportWidth, height: 900 });
    for (const link of await navigation.locator('.nav-links a').all()) {
      expect(
        await link.evaluate((element) => {
          const range = document.createRange();
          range.selectNodeContents(element);
          return range.getClientRects().length;
        }),
      ).toBe(1);
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    expect(
      await page.locator('.site-footer').evaluate((element) => getComputedStyle(element).marginTop),
    ).toBe('8px');
  }
});
