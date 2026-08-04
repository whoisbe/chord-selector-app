// End-to-end coverage of the phrase-lookup surface (Loop 013).
//
// This suite is written accessibility-first, per the Loop 013 handoff
// (Section 3): every key on the phrase keyboard is located by its
// accessible name, of the form "{pitch}, {state}" — never by CSS, XPath, or
// position. That is deliberate, not incidental: the suite can only pass if
// PhraseKeyboard.tsx keeps emitting correct, complete accessible names,
// converting a property that was previously checked by hand into one
// enforced on every run. See docs/adr/0004-playwright-e2e.md.
//
// No data-testid is used anywhere in this file, even though a handful
// already exist elsewhere in src/ from prior loops (see the Loop 013 sprint
// output for that pre-existing discrepancy) — adding reliance on them here
// would just entrench the thing this suite exists to move away from.

import { test, expect, type Page } from '@playwright/test';

// Selects a phrase-keyboard key by its pitch label, regardless of current
// state — the state suffix ("entered" / "available next" / ...) changes as
// the query is built, and callers that don't care which state a key is in
// right now (they're about to click it) shouldn't have to spell it out.
function keyByPitch(page: Page, pitchLabel: string) {
  return page.getByRole('button', { name: new RegExp(`^${pitchLabel}, `) });
}

async function openPhraseLookupTab(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Phrase Lookup', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Phrase keyboard' })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await openPhraseLookupTab(page);
});

// Section 5, item 1.
test('the Phrase Lookup tab renders the keyboard surface', async ({ page }) => {
  await expect(page.getByRole('group', { name: 'Phrase keyboard' })).toBeVisible();
});

// Section 5, item 2.
test('the initial state highlights 55 possible next notes', async ({ page }) => {
  await expect(page.getByText('55 possible next notes highlighted')).toBeVisible();
});

// Section 5, item 3.
test('the initial state has exactly one key row and no row labels', async ({ page }) => {
  await expect(page.getByRole('group', { name: 'Phrase keyboard' })).toHaveCount(1);
  await expect(page.getByText('Upper row')).toHaveCount(0);
  await expect(page.getByText('Lower row')).toHaveCount(0);
});

// Section 5, item 4.
test('selecting F#3 narrows to 16 possible next notes and 43 containing onsets', async ({
  page,
}) => {
  await keyByPitch(page, 'F#3').click();

  await expect(page.getByText('16 possible next notes highlighted')).toBeVisible();
  await expect(
    page.getByText('43 onsets in the piece contain the current selection'),
  ).toBeVisible();
});

// Section 5, item 5.
test('adding F#4 to the selection narrows to 8 possible next notes, 6 onsets, and shows [F#3+F#4]', async ({
  page,
}) => {
  await keyByPitch(page, 'F#3').click();
  await keyByPitch(page, 'F#4').click();

  await expect(page.getByText('8 possible next notes highlighted')).toBeVisible();
  await expect(
    page.getByText('6 onsets in the piece contain the current selection'),
  ).toBeVisible();
  await expect(page.getByText('Current group: [F#3+F#4]')).toBeVisible();
});

// Section 5, item 6.
test('F#4 stays selectable across the staff boundary while F#3 is selected', async ({ page }) => {
  await keyByPitch(page, 'F#3').click();

  await expect(page.getByRole('button', { name: 'F#4, available next' })).toBeVisible();
});

// Section 5, item 7 — the founding query.
test('the founding query finds 1 occurrence of [F#3+F#4] → [C#4] → [E4] at Measure 12, beat 4', async ({
  page,
}) => {
  await keyByPitch(page, 'F#3').click();
  await keyByPitch(page, 'F#4').click();
  await page.getByRole('button', { name: 'Add group', exact: true }).click();

  await keyByPitch(page, 'C#4').click();
  await page.getByRole('button', { name: 'Add group', exact: true }).click();

  await keyByPitch(page, 'E4').click();
  await page.getByRole('button', { name: 'Add group', exact: true }).click();

  await expect(
    page.getByText('1 occurrence of [F#3+F#4] → [C#4] → [E4]'),
  ).toBeVisible();
  await expect(page.getByText('Measure 12, beat 4')).toBeVisible();
});

// Section 5, item 8.
test('E4 does not occur together with F#3 in the current selection', async ({ page }) => {
  await keyByPitch(page, 'F#3').click();

  await expect(
    page.getByRole('button', {
      name: 'E4, does not occur together with the current selection',
    }),
  ).toBeVisible();
});

// Section 5, item 9.
test('undo removes the last committed group and updates the phrase', async ({ page }) => {
  await keyByPitch(page, 'F#3').click();
  await keyByPitch(page, 'F#4').click();
  await page.getByRole('button', { name: 'Add group', exact: true }).click();

  await keyByPitch(page, 'C#4').click();
  await page.getByRole('button', { name: 'Add group', exact: true }).click();

  await expect(page.getByText('Phrase: [F#3+F#4] → [C#4]')).toBeVisible();

  await page.getByRole('button', { name: 'Undo last group', exact: true }).click();

  await expect(page.getByText('Phrase: [F#3+F#4] → [C#4]')).toHaveCount(0);
  await expect(page.getByText('Phrase: [F#3+F#4]', { exact: true })).toBeVisible();
});

// Section 5, item 10.
test('clear all returns to 55 possible next notes and an empty phrase', async ({ page }) => {
  await keyByPitch(page, 'F#3').click();
  await page.getByRole('button', { name: 'Add group', exact: true }).click();

  await page.getByRole('button', { name: 'Clear all', exact: true }).click();

  await expect(page.getByText('55 possible next notes highlighted')).toBeVisible();
  await expect(page.getByText('Phrase: empty', { exact: true })).toBeVisible();
});

// Section 5, item 11.
test('every key name matches "{pitch}, {state}" and none names a row', async ({ page }) => {
  const names = await page
    .getByRole('group', { name: 'Phrase keyboard' })
    .getByRole('button')
    .evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label')));

  expect(names.length).toBeGreaterThan(0);

  const validState =
    /^[A-G]#?-?\d+, (entered|available next|not available next|does not occur together with the current selection)$/;

  for (const name of names) {
    expect(name).toMatch(validState);
    expect(name?.toLowerCase()).not.toContain('row');
  }
});
