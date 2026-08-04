// End-to-end coverage of the focused occurrence and its measure navigation
// (Loop 016).
//
// Accessibility-first like the two suites beside it: every locator is a role,
// an accessible name, or visible text. No data-testid appears here — a few
// exist in src/ from earlier loops and are deliberately left alone. That rule
// is what makes this suite double as the regression test for the new
// controls' names: `<` and `>` are glyphs on screen, so the only thing these
// tests can select them by is the accessible name they are required to carry,
// and an unnamed icon button would fail here before anyone met it with a
// screen reader.
//
// The two checks this loop turns on are geometric, not visual. A navigation
// whose frame shifts underneath it implies movement that is not in the music,
// so "the window did not change" and "this pitch did not move" are both
// asserted on measured boxes rather than on appearance.

import { test, expect, type Page } from '@playwright/test';

function keyByPitch(page: Page, pitchLabel: string) {
  return page.getByRole('button', { name: new RegExp(`^${pitchLabel}, `) });
}

function onsetKeyboards(page: Page) {
  return page.getByRole('group', { name: 'Onset keyboard', exact: true });
}

function measureNavigation(page: Page) {
  return page.getByRole('group', { name: 'Measure navigation' });
}

function occurrenceHeading(page: Page, label: string) {
  return page.getByRole('button', { name: label });
}

async function openPhraseLookupTab(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Phrase Lookup', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Phrase keyboard' })).toBeVisible();
}

async function addGroup(page: Page) {
  await page.getByRole('button', { name: 'Add group', exact: true }).click();
}

// [F#3+F#4] → [C#4] → [E4]: one occurrence, at measure 12 beat 4. All three
// matched onsets sit in measure 12 — they are its last three — which is why
// the compact strip's three following onsets and this view's `>` answer
// different questions.
async function enterFoundingQuery(page: Page) {
  await keyByPitch(page, 'F#3').click();
  await keyByPitch(page, 'F#4').click();
  await addGroup(page);

  await keyByPitch(page, 'C#4').click();
  await addGroup(page);

  await keyByPitch(page, 'E4').click();
  await addGroup(page);
}

// [C#2+G#2+C#3+E3]: two occurrences, measure 5 and measure 42 — the smallest
// query in this piece that can show one occurrence open and another collapsed
// at the same time.
async function enterTwoMatchQuery(page: Page) {
  await keyByPitch(page, 'C#2').click();
  await keyByPitch(page, 'G#2').click();
  await keyByPitch(page, 'C#3').click();
  await keyByPitch(page, 'E3').click();
  await addGroup(page);
}

// [C#2+C#3+G#3]: the movement's opening chord, occurring only at measure 1 —
// the lower boundary.
async function enterFirstMeasureQuery(page: Page) {
  await keyByPitch(page, 'C#2').click();
  await keyByPitch(page, 'C#3').click();
  await keyByPitch(page, 'G#3').click();
  await addGroup(page);
}

// [C#2+G#2+C#3+E3+G#3+C#4]: the closing chord, at measure 68 beat 3 and again
// at measure 69 beat 1 — the upper boundary, and a second occurrence to make
// sure the boundary is a property of the measure and not of being the only
// result.
async function enterLastMeasureQuery(page: Page) {
  await keyByPitch(page, 'C#2').click();
  await keyByPitch(page, 'G#2').click();
  await keyByPitch(page, 'C#3').click();
  await keyByPitch(page, 'E3').click();
  await keyByPitch(page, 'G#3').click();
  await keyByPitch(page, 'C#4').click();
  await addGroup(page);
}

function boxesOf(locator: ReturnType<Page['getByRole']>) {
  return locator.evaluateAll((nodes) =>
    nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }),
  );
}

test.beforeEach(async ({ page }) => {
  await openPhraseLookupTab(page);
});

// Check 7 — nothing about the default view moves until an occurrence is
// opened: matched across, up to three following stacked, and no navigation.
test('the unfocused result keeps its compact strip and offers no navigation', async ({ page }) => {
  await enterFoundingQuery(page);

  await expect(onsetKeyboards(page)).toHaveCount(6);
  await expect(page.getByRole('group', { name: 'Matched onsets' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Following onsets' })).toBeVisible();
  await expect(measureNavigation(page)).toHaveCount(0);
  await expect(occurrenceHeading(page, 'Measure 12, beat 4')).toHaveAttribute(
    'aria-expanded',
    'false',
  );
});

// Checks 8 and 9 — one expands, the rest collapse to a line and stay
// selectable, and there is a control back.
test('opening one occurrence collapses the others, and there is a way back', async ({ page }) => {
  await enterTwoMatchQuery(page);

  await expect(page.getByText('2 occurrences of [C#2+G#2+C#3+E3]')).toBeVisible();
  // Two compact strips: one matched onset and three following, each.
  await expect(onsetKeyboards(page)).toHaveCount(8);

  await occurrenceHeading(page, 'Measure 5, beat 1').click();

  await expect(occurrenceHeading(page, 'Measure 5, beat 1')).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await expect(measureNavigation(page)).toBeVisible();
  await expect(page.getByRole('group', { name: 'Onsets in measure 5' })).toBeVisible();

  // The other occurrence is still there, still selectable, summarised by the
  // two things that actually differ between occurrences of an exact match:
  // where it is, and what follows it.
  const collapsed = occurrenceHeading(page, 'Measure 42, beat 1');
  await expect(collapsed).toBeVisible();
  await expect(collapsed).toHaveAttribute('aria-expanded', 'false');
  await expect(collapsed.getByText('then [G#3]')).toBeVisible();

  // Only the open occurrence draws keyboards, so only one pitch window is on
  // screen at a time — here, the thirteen onsets of measure 5.
  await expect(onsetKeyboards(page)).toHaveCount(13);

  await page.getByRole('button', { name: 'Back to all occurrences' }).click();

  await expect(measureNavigation(page)).toHaveCount(0);
  await expect(onsetKeyboards(page)).toHaveCount(8);
  await expect(occurrenceHeading(page, 'Measure 5, beat 1')).toHaveAttribute(
    'aria-expanded',
    'false',
  );
});

// Check 8, from the other side: a collapsed occurrence can be opened directly,
// without going back to the unfocused list first.
test('a collapsed occurrence can be opened while another is open', async ({ page }) => {
  await enterTwoMatchQuery(page);

  await occurrenceHeading(page, 'Measure 5, beat 1').click();
  await expect(page.getByText('Measure 5 of 69')).toBeVisible();

  await occurrenceHeading(page, 'Measure 42, beat 1').click();

  await expect(page.getByText('Measure 42 of 69')).toBeVisible();
  await expect(page.getByRole('group', { name: 'Onsets in measure 42' })).toBeVisible();
  await expect(occurrenceHeading(page, 'Measure 5, beat 1')).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await expect(measureNavigation(page)).toHaveCount(1);
});

// Check 10 — the loop. The focused view is drawn on the full-piece window,
// and stepping a measure does not move it: same stated range, same measured
// width on every keyboard, before and after.
test('the focused window is F1 to D#6, 34 white keys, and is identical after a step', async ({
  page,
}) => {
  await enterFoundingQuery(page);
  await occurrenceHeading(page, 'Measure 12, beat 4').click();

  const fixedWindow = page.getByText(
    'Same range on every keyboard: F1 to D#6, 34 white keys',
  );
  await expect(fixedWindow).toBeVisible();

  const before = await onsetKeyboards(page).evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('width')),
  );
  expect(before).toHaveLength(12);
  expect(new Set(before).size).toBe(1);

  await page.getByRole('button', { name: 'Next measure, 13' }).click();
  await expect(page.getByText('Measure 13 of 69')).toBeVisible();

  await expect(fixedWindow).toBeVisible();

  const after = await onsetKeyboards(page).evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('width')),
  );
  expect(after).toHaveLength(12);
  expect(new Set(after).size).toBe(1);
  expect(after[0]).toBe(before[0]);
});

// Check 11 — a pitch holds its x across a step. F#4 sounds once in measure 12
// (at beat 4, part of the match) and once in measure 13 (at beat 1); if the
// window were recomputed per measure, those two would land in different
// places and the reader would see melodic movement that is not in the music.
test('F#4 occupies the same x in measure 12 and in measure 13', async ({ page }) => {
  await enterFoundingQuery(page);
  await occurrenceHeading(page, 'Measure 12, beat 4').click();
  await expect(page.getByText('Measure 12 of 69')).toBeVisible();

  const inTwelve = page.getByRole('img', { name: 'F#4', exact: true });
  await expect(inTwelve).toHaveCount(1);
  const twelfth = await inTwelve.locator('rect').first().boundingBox();

  await page.getByRole('button', { name: 'Next measure, 13' }).click();
  await expect(page.getByText('Measure 13 of 69')).toBeVisible();

  const inThirteen = page.getByRole('img', { name: 'F#4', exact: true });
  await expect(inThirteen).toHaveCount(1);
  const thirteenth = await inThirteen.locator('rect').first().boundingBox();

  expect(twelfth).not.toBeNull();
  expect(thirteenth).not.toBeNull();
  expect(thirteenth!.x).toBeCloseTo(twelfth!.x, 1);
  expect(thirteenth!.width).toBeCloseTo(twelfth!.width, 1);
});

// Checks 12, 13 and 16 — stepping, labelling, and naming, in one walk. Each
// control names both what it does and where it goes, and the target in the
// name is the measure that actually arrives.
test('stepping runs 12 → 13 → 14 and back to 13, labelled at every stop', async ({ page }) => {
  await enterFoundingQuery(page);
  await occurrenceHeading(page, 'Measure 12, beat 4').click();

  await expect(page.getByText('Measure 12 of 69')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Previous measure, 11' })).toBeEnabled();

  await page.getByRole('button', { name: 'Next measure, 13' }).click();
  await expect(page.getByText('Measure 13 of 69')).toBeVisible();
  await expect(page.getByRole('group', { name: 'Onsets in measure 13' })).toBeVisible();

  await page.getByRole('button', { name: 'Next measure, 14' }).click();
  await expect(page.getByText('Measure 14 of 69')).toBeVisible();

  await page.getByRole('button', { name: 'Previous measure, 13' }).click();
  await expect(page.getByText('Measure 13 of 69')).toBeVisible();
  await expect(page.getByRole('group', { name: 'Onsets in measure 13' })).toBeVisible();

  // The occurrence heading still says where the match is, so paging away
  // never loses the thing that was searched for.
  await expect(page.getByText('Measure 12, beat 4')).toBeVisible();
});

// Check 14 — the anchor is distinguished from its surroundings by a word, not
// by a colour: three of measure 12's twelve rows carry a visible "matched"
// badge, and the badges sit on exactly the three rows that are the match.
test('the matched onsets are badged in text, and only they are', async ({ page }) => {
  await enterFoundingQuery(page);
  await occurrenceHeading(page, 'Measure 12, beat 4').click();

  const onsets = page.getByRole('group', { name: 'Onsets in measure 12' });
  const badges = onsets.getByText('matched', { exact: true });
  await expect(badges).toHaveCount(3);
  await expect(onsetKeyboards(page)).toHaveCount(12);

  // The badged rows are the last three onsets of the measure — the match is
  // at beat 4, near the end of the bar. Compared by measured position rather
  // than by trusting the order things were written in.
  const keyboardBoxes = await boxesOf(onsetKeyboards(page));
  const badgeBoxes = await boxesOf(badges);

  for (let index = 0; index < 3; index += 1) {
    const row = keyboardBoxes[9 + index];
    const badge = badgeBoxes[index];
    const badgeCentre = badge.y + badge.height / 2;

    expect(badgeCentre).toBeGreaterThanOrEqual(row.y);
    expect(badgeCentre).toBeLessThanOrEqual(row.y + row.height);
    // The badge sits left of the keyboard, in a gutter every row has.
    expect(badge.x).toBeLessThan(row.x);
  }

  // Measure 13 holds none of the match, so nothing there claims to be it.
  await page.getByRole('button', { name: 'Next measure, 13' }).click();
  await expect(page.getByRole('group', { name: 'Onsets in measure 13' })).toBeVisible();
  await expect(
    page.getByRole('group', { name: 'Onsets in measure 13' }).getByText('matched', { exact: true }),
  ).toHaveCount(0);
});

// Check 11 again, at the level the badge could have broken it: the gutter
// exists on every row, badged or not, so the keyboards all start at the same
// x within a measure that contains both kinds of row.
test('badged and unbadged rows start at the same x', async ({ page }) => {
  await enterFoundingQuery(page);
  await occurrenceHeading(page, 'Measure 12, beat 4').click();

  const boxes = await boxesOf(onsetKeyboards(page));
  expect(boxes).toHaveLength(12);

  for (const box of boxes) {
    expect(box.x).toBeCloseTo(boxes[0].x, 1);
    expect(box.width).toBeCloseTo(boxes[0].width, 1);
  }
});

// Check 15 — at the first measure the backward control is disabled and still
// there. A control that disappeared at a boundary would be indistinguishable
// from a crash.
test('at measure 1 the previous control is present and disabled', async ({ page }) => {
  await enterFirstMeasureQuery(page);
  await occurrenceHeading(page, 'Measure 1, beat 1').click();

  await expect(page.getByText('Measure 1 of 69')).toBeVisible();

  const previous = page.getByRole('button', { name: /^Previous measure/ });
  await expect(previous).toBeVisible();
  await expect(previous).toBeDisabled();
  await expect(previous).toHaveAccessibleName('Previous measure, unavailable at measure 1');

  await expect(page.getByRole('button', { name: 'Next measure, 2' })).toBeEnabled();
});

// Check 15, the other end.
test('at measure 69 the next control is present and disabled', async ({ page }) => {
  await enterLastMeasureQuery(page);
  await occurrenceHeading(page, 'Measure 69, beat 1').click();

  await expect(page.getByText('Measure 69 of 69')).toBeVisible();

  const next = page.getByRole('button', { name: /^Next measure/ });
  await expect(next).toBeVisible();
  await expect(next).toBeDisabled();
  await expect(next).toHaveAccessibleName('Next measure, unavailable at measure 69');

  await expect(page.getByRole('button', { name: 'Previous measure, 68' })).toBeEnabled();

  // The final measure holds one onset, and it is the match itself.
  await expect(onsetKeyboards(page)).toHaveCount(1);
  await expect(
    page.getByRole('group', { name: 'Onsets in measure 69' }).getByText('matched', { exact: true }),
  ).toHaveCount(1);
});

// Check 17 — focused and navigated from the keyboard alone: Enter opens the
// occurrence, Tab reaches the controls in the order they are read, and Enter
// steps the measure. No mouse anywhere in this test.
test('an occurrence can be opened and paged entirely from the keyboard', async ({ page }) => {
  await enterFoundingQuery(page);

  const heading = occurrenceHeading(page, 'Measure 12, beat 4');
  await heading.press('Enter');
  await expect(heading).toHaveAttribute('aria-expanded', 'true');

  // Focus stays on the control that was pressed — opening the occurrence does
  // not move it out from under the person who opened it.
  await expect(heading).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Back to all occurrences' })).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Previous measure, 11' })).toBeFocused();

  await page.keyboard.press('Tab');
  const next = page.getByRole('button', { name: 'Next measure, 13' });
  await expect(next).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page.getByText('Measure 13 of 69')).toBeVisible();

  // And back out again without touching the mouse.
  await page.keyboard.press('Escape');
  await expect(heading).toHaveAttribute('aria-expanded', 'false');
  await expect(measureNavigation(page)).toHaveCount(0);
});

// Check 18, from the outside: focus is session state. Nothing is stored, so
// nothing comes back.
test('an open occurrence does not survive a reload', async ({ page }) => {
  await enterFoundingQuery(page);
  await occurrenceHeading(page, 'Measure 12, beat 4').click();
  await expect(measureNavigation(page)).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'Phrase Lookup', exact: true }).click();
  await enterFoundingQuery(page);

  await expect(measureNavigation(page)).toHaveCount(0);
  await expect(occurrenceHeading(page, 'Measure 12, beat 4')).toHaveAttribute(
    'aria-expanded',
    'false',
  );
});

// Check 18 again, for the case that would have put two pitch windows on
// screen at once: starting a new selection while an occurrence is open drops
// the focus rather than drawing the containment strips beside a differently
// framed measure.
test('starting a new selection closes the open occurrence', async ({ page }) => {
  await enterFoundingQuery(page);
  await occurrenceHeading(page, 'Measure 12, beat 4').click();
  await expect(measureNavigation(page)).toBeVisible();

  await keyByPitch(page, 'F#3').click();

  await expect(measureNavigation(page)).toHaveCount(0);
});

// Check 19 — still not a piano roll. One row per onset, evenly spaced,
// however long the notes are: the rows of a measure are the same height and
// the same distance apart, and nothing on the page plays anything.
test('the measure is a column of evenly spaced rows, with no playback', async ({ page }) => {
  await enterFoundingQuery(page);
  await occurrenceHeading(page, 'Measure 12, beat 4').click();

  const boxes = await boxesOf(onsetKeyboards(page));
  expect(boxes).toHaveLength(12);

  const firstGap = boxes[1].y - boxes[0].y;
  expect(firstGap).toBeGreaterThan(0);

  for (let index = 1; index < boxes.length; index += 1) {
    expect(boxes[index].y - boxes[index - 1].y).toBeCloseTo(firstGap, 1);
    expect(boxes[index].height).toBeCloseTo(boxes[0].height, 1);
  }

  expect(await page.locator('audio').count()).toBe(0);
  expect(await page.locator('video').count()).toBe(0);
});
