// End-to-end coverage of browsing the piece (Loop 017).
//
// Written accessibility-first, like the three suites beside it: every locator
// here is a role and an accessible name, or visible text. No data-testid
// appears in this file, even where one would have been easier — nine already
// exist in src/ from earlier loops, and leaning on them would give up the
// property this suite exists to enforce, namely that the surface keeps naming
// things.
//
// Three locators deserve a word. The browse view is a <section aria-label>,
// so it is a "region" named "Browse the piece" and its presence or absence is
// the whole of "query replaces browse". Each measure is a group named
// "Measure N" carrying a heading of the same text, which is what makes "every
// rendered measure is labelled" assertable rather than merely visible. And
// each onset keyboard is the same <svg role="group"> named "Onset keyboard"
// the results surface draws, which is what lets the fixed-frame checks compare
// browse's geometry against the frame the rest of the app already uses.

import { test, expect, type Page } from '@playwright/test';

function keyByPitch(page: Page, pitchLabel: string) {
  return page.getByRole('button', { name: new RegExp(`^${pitchLabel}, `) });
}

function onsetKeyboards(page: Page) {
  return page.getByRole('group', { name: 'Onset keyboard', exact: true });
}

function browseRegion(page: Page) {
  return page.getByRole('region', { name: 'Browse the piece' });
}

function measureGroups(page: Page) {
  return page.getByRole('group', { name: /^Measure \d+$/ });
}

function measureGroup(page: Page, measure: number) {
  return page.getByRole('group', { name: `Measure ${measure}`, exact: true });
}

function jumpField(page: Page) {
  return page.getByLabel('Go to measure');
}

function showMore(page: Page) {
  return page.getByRole('button', { name: /^Show more measures/ });
}

function boxesOf(locator: ReturnType<Page['getByRole']>) {
  return locator.evaluateAll((nodes) =>
    nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }),
  );
}

async function openPhraseLookupTab(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Phrase Lookup', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Phrase keyboard' })).toBeVisible();
}

// A jump, driven from the keyboard: type the number and press the key already
// under the reader's finger. `fill` is not a click, and `Enter` submits the
// form, so nothing in this helper needs a pointer.
async function jumpTo(page: Page, typed: string) {
  await jumpField(page).fill(typed);
  await jumpField(page).press('Enter');
}

test.beforeEach(async ({ page }) => {
  await openPhraseLookupTab(page);
});

// Check 7 — the piece is what you land on. Nothing is entered, nothing is
// clicked beyond reaching the tab at all.
test('browse is what the tab lands on, with measure 1 already drawn', async ({ page }) => {
  await expect(browseRegion(page)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Measure 1', exact: true })).toBeVisible();
  await expect(page.getByText('Showing measures 1 to 3 of 69.')).toBeVisible();

  // The onsets themselves, not merely a heading promising them.
  await expect(measureGroup(page, 1).getByRole('group', { name: 'Onset keyboard' })).toHaveCount(
    12,
  );
});

// Check 8 — bounded. Three measures of the movement's sixty-nine, 36 of its
// 823 onsets, and the key nodes that actually costs.
test('the first page is three measures and 36 onsets, and measure 4 is not drawn', async ({
  page,
}) => {
  await expect(measureGroups(page)).toHaveCount(3);
  await expect(onsetKeyboards(page)).toHaveCount(36);
  await expect(measureGroup(page, 4)).toHaveCount(0);

  // Every key of every keyboard is one <path>. 36 onsets × 59 keys across
  // F1–D#6 is what the initial page asks the browser to draw, against 48,557
  // for the whole movement — a ceiling, not a smoothness concern.
  const keyNodes = await onsetKeyboards(page).evaluateAll((nodes) =>
    nodes.reduce((total, node) => total + node.querySelectorAll('path').length, 0),
  );
  expect(keyNodes).toBe(2124);
});

// Check 15 — the measure number is the landmark, so every measure on the page
// carries one.
test('every rendered measure carries its number', async ({ page }) => {
  const names = await measureGroups(page).evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('aria-label')),
  );
  expect(names).toEqual(['Measure 1', 'Measure 2', 'Measure 3']);

  for (const measure of [1, 2, 3]) {
    await expect(
      page.getByRole('heading', { name: `Measure ${measure}`, exact: true }),
    ).toBeVisible();
  }
});

// Check 9 — loading more extends the piece in front of the reader rather than
// replacing what they have already read.
test('showing more adds measures 4 to 6 and keeps 1 to 3', async ({ page }) => {
  await expect(showMore(page)).toHaveAccessibleName('Show more measures, from measure 4');

  await showMore(page).click();

  await expect(measureGroups(page)).toHaveCount(6);
  for (const measure of [1, 2, 3, 4, 5, 6]) {
    await expect(measureGroup(page, measure)).toBeVisible();
  }

  // 12 + 12 + 12 already there, plus 12 + 13 + 13 arriving.
  await expect(onsetKeyboards(page)).toHaveCount(74);
  await expect(page.getByText('Showing measures 1 to 6 of 69.')).toBeVisible();
});

// Check 10, the half that is easy to miss. Scrolling alone must load nothing —
// if it did, the control below would look finished while quietly being
// optional, and the reader who cannot scroll would be stranded.
test('scrolling to the end of the drawn measures loads nothing more', async ({ page }) => {
  await expect(onsetKeyboards(page)).toHaveCount(36);

  const heading = page.getByRole('heading', { name: 'Measure 1', exact: true });
  const before = await heading.boundingBox();
  expect(before).not.toBeNull();

  // Scroll all the way to the bottom of what is drawn — the moment an
  // intersection observer would fire, if one existed.
  await showMore(page).scrollIntoViewIfNeeded();

  // The scroll really happened, whichever element does the scrolling here:
  // measure 1's heading has moved up the viewport. Without this the test
  // would prove nothing.
  const after = await heading.boundingBox();
  expect(after).not.toBeNull();
  expect(after!.y).toBeLessThan(before!.y - 1000);

  await expect(measureGroups(page)).toHaveCount(3);
  await expect(measureGroup(page, 4)).toHaveCount(0);
  await expect(onsetKeyboards(page)).toHaveCount(36);
});

// Check 10 — and the half that makes the feature reachable at all. No click
// anywhere in this test: the control is focused and activated with a key.
test('more measures load from the keyboard alone', async ({ page }) => {
  const more = showMore(page);

  await more.focus();
  await expect(more).toBeFocused();

  await page.keyboard.press('Enter');

  await expect(measureGroup(page, 6)).toBeVisible();
  await expect(onsetKeyboards(page)).toHaveCount(74);

  // Focus stays where the reader put it, so a second press loads a second
  // page without hunting for the control again.
  await expect(more).toBeFocused();
  await expect(more).toHaveAccessibleName('Show more measures, from measure 7');

  await page.keyboard.press('Enter');
  await expect(measureGroup(page, 9)).toBeVisible();
  await expect(page.getByText('Showing measures 1 to 9 of 69.')).toBeVisible();
});

// Check 11 — the use case the loop exists for. Reaching measure 34 by
// scrolling costs tens of thousands of pixels; jumping costs a number and a
// key press, and the page does not move at all.
test('jumping to measure 34 lands on it without scrolling', async ({ page }) => {
  await jumpTo(page, '34');

  await expect(page.getByText('Showing measures 34 to 36 of 69.')).toBeVisible();
  const heading = page.getByRole('heading', { name: 'Measure 34', exact: true });
  await expect(heading).toBeVisible();

  // Measure 34 is inside the first viewport, not tens of thousands of pixels
  // down the page. boundingBox is viewport-relative, so this is a claim about
  // what the reader can actually see without scrolling anywhere — whichever
  // element does the scrolling on this page.
  const box = await heading.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.y).toBeGreaterThan(0);
  expect(box!.y).toBeLessThan(viewport!.height);

  // The jump re-anchors rather than appending: measure 1 is no longer drawn.
  await expect(measureGroup(page, 1)).toHaveCount(0);
  await expect(measureGroups(page)).toHaveCount(3);
});

// Check 12 — every refusal is visible and says what is wrong, and the piece's
// own last measure is in the sentence. The 69 is computed: browse.test.ts
// gives the same code a five-measure piece and gets "measures 1 to 5".
test('0, 70 and a non-number are each refused out loud', async ({ page }) => {
  await jumpTo(page, '0');
  await expect(page.getByRole('alert')).toHaveText(
    'Measure 0 is outside this piece. This piece has measures 1 to 69.',
  );
  await expect(page.getByText('Showing measures 1 to 3 of 69.')).toBeVisible();

  await jumpTo(page, '70');
  await expect(page.getByRole('alert')).toHaveText(
    'Measure 70 is outside this piece. This piece has measures 1 to 69.',
  );

  await jumpTo(page, 'abc');
  await expect(page.getByRole('alert')).toHaveText(
    '"abc" is not a measure number. This piece has measures 1 to 69.',
  );

  await jumpTo(page, '');
  await expect(page.getByRole('alert')).toHaveText(
    'Enter a measure number. This piece has measures 1 to 69.',
  );

  // Still on measure 1: a refused jump changes nothing but the message.
  await expect(measureGroup(page, 1)).toBeVisible();

  // And a good number afterwards still works — the control is not left stuck.
  await jumpTo(page, '34');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(measureGroup(page, 34)).toBeVisible();
});

// Check 13 — the loop. A window recomputed per measure would resize the keys
// continuously through a scroll this long, so the frame is the whole piece and
// never moves.
test('every browse keyboard is F1 to D#6, 34 white keys, at measure 1 and at 34', async ({
  page,
}) => {
  const sentence = page.getByText(
    'Same range on every browse keyboard: F1 to D#6, 34 white keys — fixed for the whole piece, so a pitch keeps its place from the first measure to the last.',
  );

  await expect(sentence).toBeVisible();
  await expect(onsetKeyboards(page)).toHaveCount(36);

  const atOne = await onsetKeyboards(page).evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('width')),
  );
  expect(atOne).toHaveLength(36);
  expect(new Set(atOne).size).toBe(1);

  await jumpTo(page, '34');
  await expect(measureGroup(page, 34)).toBeVisible();
  await expect(sentence).toBeVisible();

  const atThirtyFour = await onsetKeyboards(page).evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('width')),
  );
  expect(new Set(atThirtyFour).size).toBe(1);
  expect(atThirtyFour[0]).toBe(atOne[0]);
});

// Check 14 — the other half of the loop, and the one that can only be settled
// by measuring. C#4 sounds in measure 1 and again in measure 34; if the frame
// were computed from what is on the page, those two would not line up.
test('C#4 occupies the same x in measure 1 and in measure 34', async ({ page }) => {
  const inOne = measureGroup(page, 1).getByRole('img', { name: 'C#4', exact: true }).first();
  await expect(inOne).toBeVisible();
  const first = await inOne.locator('rect').first().boundingBox();

  await jumpTo(page, '34');
  await expect(measureGroup(page, 34)).toBeVisible();

  const inThirtyFour = measureGroup(page, 34)
    .getByRole('img', { name: 'C#4', exact: true })
    .first();
  await expect(inThirtyFour).toBeVisible();
  const later = await inThirtyFour.locator('rect').first().boundingBox();

  expect(first).not.toBeNull();
  expect(later).not.toBeNull();
  expect(later!.x).toBeCloseTo(first!.x, 1);
  expect(later!.width).toBeCloseTo(first!.width, 1);
});

// Check 16 — one surface, two ways in. Browse goes the moment a key is
// touched, not only when a group is committed, so there is never more than one
// pitch ruler on the page.
test('entering a phrase replaces browse, and clearing brings it back', async ({ page }) => {
  await expect(browseRegion(page)).toBeVisible();

  await keyByPitch(page, 'F#3').click();
  await expect(browseRegion(page)).toHaveCount(0);
  await expect(onsetKeyboards(page)).toHaveCount(0);

  await keyByPitch(page, 'F#4').click();
  await page.getByRole('button', { name: 'Add group', exact: true }).click();
  await expect(page.getByText('Phrase: [F#3+F#4]', { exact: true })).toBeVisible();
  await expect(browseRegion(page)).toHaveCount(0);

  await page.getByRole('button', { name: 'Clear all', exact: true }).click();
  await expect(browseRegion(page)).toBeVisible();
  await expect(page.getByText('Showing measures 1 to 3 of 69.')).toBeVisible();
});

// Where the reader had got to is not part of the query, so clearing the query
// does not throw them back to the start of the piece.
test('clearing a query returns the reader to where they were reading', async ({ page }) => {
  await jumpTo(page, '34');
  await expect(page.getByText('Showing measures 34 to 36 of 69.')).toBeVisible();

  await keyByPitch(page, 'F#3').click();
  await expect(browseRegion(page)).toHaveCount(0);

  await page.getByRole('button', { name: 'Clear all', exact: true }).click();
  await expect(page.getByText('Showing measures 34 to 36 of 69.')).toBeVisible();
  await expect(measureGroup(page, 34)).toBeVisible();
});

// Check 18 — session state only. Nothing about where the reader got to is
// stored anywhere, and a reload proves it from outside the code.
test('the browse position does not survive a reload', async ({ page }) => {
  await jumpTo(page, '34');
  await expect(page.getByText('Showing measures 34 to 36 of 69.')).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'Phrase Lookup', exact: true }).click();

  await expect(page.getByText('Showing measures 1 to 3 of 69.')).toBeVisible();
  await expect(measureGroup(page, 1)).toBeVisible();
  await expect(measureGroup(page, 34)).toHaveCount(0);
});

// At the end of the piece the control is disabled, never hidden: a control
// that vanished there would read as a crash rather than as an ending.
test('at measure 69 the show-more control is present and disabled', async ({ page }) => {
  await jumpTo(page, '69');

  await expect(page.getByText('Showing measure 69 of 69.')).toBeVisible();
  await expect(measureGroups(page)).toHaveCount(1);
  await expect(onsetKeyboards(page)).toHaveCount(1);

  await expect(showMore(page)).toBeVisible();
  await expect(showMore(page)).toBeDisabled();
  await expect(showMore(page)).toHaveAccessibleName(
    'Show more measures, unavailable at the end of the piece',
  );
});

// Check 19 — one row per onset, evenly spaced, in stream order. Nothing here
// reads a duration, nothing spaces rows by rhythm, and nothing plays.
test('a measure is a column of evenly spaced rows, with no playback', async ({ page }) => {
  const rows = measureGroup(page, 1).getByRole('group', { name: 'Onset keyboard' });
  await expect(rows).toHaveCount(12);

  const boxes = await boxesOf(rows);
  const firstGap = boxes[1].y - boxes[0].y;
  expect(firstGap).toBeGreaterThan(0);

  for (let index = 1; index < boxes.length; index += 1) {
    expect(boxes[index].y - boxes[index - 1].y).toBeCloseTo(firstGap, 1);
    expect(boxes[index].height).toBeCloseTo(boxes[0].height, 1);
    // Every row starts at the same x — the alignment the fixed frame exists
    // to guarantee.
    expect(boxes[index].x).toBeCloseTo(boxes[0].x, 1);
  }

  expect(await page.locator('audio').count()).toBe(0);
  expect(await page.locator('video').count()).toBe(0);
});
