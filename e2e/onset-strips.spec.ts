// End-to-end coverage of results as onset strips (Loop 014).
//
// Written accessibility-first, like the Loop 013 suite beside it: every
// locator here is a role and an accessible name. No data-testid appears in
// this file, even where one would have been easier — a few already exist in
// src/ from earlier loops, and leaning on them would give up the property
// this suite exists to enforce, namely that the surface keeps naming things.
//
// Two locators deserve a word. Each onset keyboard is a <svg role="group">
// named "Onset keyboard", so the shared-range check can collect every
// keyboard drawn at one time and compare what they were actually drawn to.
// Each sounding note inside one is a <g role="img"> named for its pitch —
// and, only while the staff toggle is on, its staff. That naming is what
// lets the staff checks below assert on the rendering itself rather than on
// a colour nobody can see in a headless browser.

import { test, expect, type Page } from '@playwright/test';

function keyByPitch(page: Page, pitchLabel: string) {
  return page.getByRole('button', { name: new RegExp(`^${pitchLabel}, `) });
}

function onsetKeyboards(page: Page) {
  return page.getByRole('group', { name: 'Onset keyboard', exact: true });
}

function staffToggle(page: Page) {
  return page.getByRole('switch', { name: 'Colour by staff' });
}

async function openPhraseLookupTab(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Phrase Lookup', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Phrase keyboard' })).toBeVisible();
}

async function addGroup(page: Page) {
  await page.getByRole('button', { name: 'Add group', exact: true }).click();
}

// [F#3+F#4] → [C#4] → [E4]: the query this project was built to answer.
async function enterFoundingQuery(page: Page) {
  await keyByPitch(page, 'F#3').click();
  await keyByPitch(page, 'F#4').click();
  await addGroup(page);

  await keyByPitch(page, 'C#4').click();
  await addGroup(page);

  await keyByPitch(page, 'E4').click();
  await addGroup(page);
}

test.beforeEach(async ({ page }) => {
  await openPhraseLookupTab(page);
});

// Check 13 — the founding query renders as strips rather than as text.
test('the founding query renders onset strips for the match at measure 12, beat 4', async ({
  page,
}) => {
  await enterFoundingQuery(page);

  await expect(page.getByText('1 occurrence of [F#3+F#4] → [C#4] → [E4]')).toBeVisible();
  await expect(page.getByText('Measure 12, beat 4')).toBeVisible();

  // Three matched onsets and the three that follow them, each its own
  // keyboard — not `matched: upper F#4 / lower F#3`.
  await expect(onsetKeyboards(page)).toHaveCount(6);
  await expect(page.getByRole('group', { name: 'Matched onsets' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Following onsets' })).toBeVisible();

  // The notes of the match, and of what comes next, are named individually.
  await expect(page.getByRole('img', { name: 'C#4', exact: true })).toHaveCount(1);
  await expect(page.getByRole('img', { name: 'B3', exact: true })).toHaveCount(1);
  await expect(page.getByRole('img', { name: 'D4', exact: true })).toHaveCount(1);
});

// Check 9 — the founding query's shared range, measured from the artifact.
test('the founding query draws every keyboard on B1 to F#4, 19 white keys', async ({ page }) => {
  await enterFoundingQuery(page);

  await expect(
    page.getByText('Same range on every keyboard: B1 to F#4, 19 white keys'),
  ).toBeVisible();
});

// Check 8 — the loop itself. Per-onset ranges would make the shapes
// incomparable, so this asserts on what the keyboards were drawn to, not on
// how they look.
test('every onset keyboard on screen is drawn to one identical range', async ({ page }) => {
  await enterFoundingQuery(page);
  await expect(onsetKeyboards(page)).toHaveCount(6);

  const widths = await onsetKeyboards(page).evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('width')),
  );

  expect(widths).toHaveLength(6);
  expect(new Set(widths).size).toBe(1);
});

// Check 8, again, on the largest set of keyboards the surface will ever draw
// at once: a shared range is only interesting if it survives the cap.
test('the shared range holds across all twelve capped results', async ({ page }) => {
  await keyByPitch(page, 'E4').click();
  await addGroup(page);

  await expect(
    page.getByText('Same range on every keyboard: F#1 to F#4, 21 white keys'),
  ).toBeVisible();

  const widths = await onsetKeyboards(page).evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('width')),
  );

  expect(widths.length).toBeGreaterThan(12);
  expect(new Set(widths).size).toBe(1);
});

// Check 10 — the cap, and the total that must always accompany it.
test('a one-note query reports all 78 occurrences and renders 12', async ({ page }) => {
  await keyByPitch(page, 'E4').click();
  await addGroup(page);

  await expect(page.getByText('78 occurrences of [E4]')).toBeVisible();
  await expect(page.getByText('showing 12')).toBeVisible();

  await expect(
    page.getByRole('list', { name: 'Occurrence list' }).getByRole('listitem'),
  ).toHaveCount(12);
});

// Check 11 — above the disclosure threshold, the count is still the only
// honest thing to show.
test('B1 plus B2 shows 13 containing onsets as a count, with no strips', async ({ page }) => {
  await keyByPitch(page, 'B1').click();
  await keyByPitch(page, 'B2').click();

  await expect(
    page.getByText('13 onsets in the piece contain the current selection'),
  ).toBeVisible();

  await expect(page.getByRole('list', { name: 'Containing onset list' })).toHaveCount(0);
  await expect(onsetKeyboards(page)).toHaveCount(0);
});

// Check 12 — at the threshold, the places themselves appear, before any
// group has been committed.
test('F#3 plus F#4 renders strips for all 6 containing onsets before commit', async ({ page }) => {
  await keyByPitch(page, 'F#3').click();
  await keyByPitch(page, 'F#4').click();

  await expect(page.getByText('6 onsets in the piece contain the current selection')).toBeVisible();

  await expect(
    page.getByRole('list', { name: 'Containing onset list' }).getByRole('listitem'),
  ).toHaveCount(6);

  // Six containing onsets plus the three that follow each of them.
  await expect(onsetKeyboards(page)).toHaveCount(24);
  await expect(
    page.getByText('Same range on every keyboard: F#1 to F#4, 21 white keys'),
  ).toBeVisible();
});

// Check 14 — single tone by default. Staff must appear nowhere: not in the
// drawing, not in an accessible name.
test('with the toggle off no staff distinction appears in names or markers', async ({ page }) => {
  await enterFoundingQuery(page);

  await expect(staffToggle(page)).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByRole('img', { name: /staff/ })).toHaveCount(0);
  await expect(page.getByRole('img', { name: 'F#4', exact: true }).first()).toBeVisible();

  // No markers are drawn either — a dot or a bar would be a staff claim.
  const marked = await onsetKeyboards(page).evaluateAll((nodes) =>
    nodes.reduce((total, node) => total + node.querySelectorAll('circle, line').length, 0),
  );

  expect(marked).toBe(0);
});

// Check 15 — the distinction appears when asked for, and does not rest on
// hue: an upper-staff note carries a dot, a lower-staff note a bar.
test('turning the toggle on distinguishes staff by marker shape, not colour alone', async ({
  page,
}) => {
  await enterFoundingQuery(page);
  await staffToggle(page).click();

  await expect(staffToggle(page)).toHaveAttribute('aria-checked', 'true');

  // Measure 12, beat 4 is the case that misled: F#4 is engraved on the upper
  // staff and F#3 on the lower, while both are played by one hand.
  const upper = page.getByRole('img', { name: 'F#4, upper staff' }).first();
  const lower = page.getByRole('img', { name: 'F#3, lower staff' }).first();

  await expect(upper).toBeVisible();
  await expect(lower).toBeVisible();

  await expect(upper.locator('circle')).toHaveCount(1);
  await expect(upper.locator('line')).toHaveCount(0);

  await expect(lower.locator('line')).toHaveCount(1);
  await expect(lower.locator('circle')).toHaveCount(0);

  await expect(page.getByText('Upper staff: dot marker. Lower staff: bar marker.')).toBeVisible();
});

// Check 16 — the control names staff, and the caveat is present.
test('the toggle names staff and carries the staff-is-not-hand caveat', async ({ page }) => {
  await enterFoundingQuery(page);

  await expect(staffToggle(page)).toBeVisible();
  await expect(
    page.getByText('Staff is how the piece was written down. It does not always match which hand'),
  ).toBeVisible();
});

// Check 17 — session state only. A toggle that survived a reload would be a
// persistence decision, and this project has no storage layer.
test('the staff toggle resets on reload', async ({ page }) => {
  await keyByPitch(page, 'F#3').click();
  await keyByPitch(page, 'F#4').click();

  await staffToggle(page).click();
  await expect(staffToggle(page)).toHaveAttribute('aria-checked', 'true');

  await page.reload();
  await page.getByRole('button', { name: 'Phrase Lookup', exact: true }).click();

  await keyByPitch(page, 'F#3').click();
  await keyByPitch(page, 'F#4').click();

  await expect(staffToggle(page)).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByRole('img', { name: /staff/ })).toHaveCount(0);
});
