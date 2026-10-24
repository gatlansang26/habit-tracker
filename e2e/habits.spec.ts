import { test, expect, type Page } from "@playwright/test";

async function addHabit(page: Page, name: string) {
  await page.getByLabel("Habit name").fill(name);
  // exact: true avoids matching row buttons whose aria-label now embeds the
  // habit name (e.g. a habit named "Add habit ..." makes its own "Check in"
  // button's accessible name contain "Add").
  await page.getByRole("button", { name: "Add", exact: true }).click();
}

function rowFor(page: Page, name: string) {
  return page.getByRole("listitem").filter({ hasText: name });
}

// row.getByRole("button", { name }) now matches by accessible name, which
// includes the habit name via aria-label; these fixtures' habit names echo
// the action under test (e.g. "Check in ..."), so match on visible button
// text instead to avoid matching the row's other button.
function rowButton(row: ReturnType<typeof rowFor>, text: string) {
  return row.getByRole("button").filter({ hasText: text });
}

test("add habit: appears with 0 day streak", async ({ page }) => {
  const name = `Add habit ${Date.now()}`;
  await page.goto("/");

  await addHabit(page, name);

  await expect(rowFor(page, name)).toContainText("0 day streak");
});

test("check in: button becomes Done today and shows 1 day streak", async ({ page }) => {
  const name = `Check in ${Date.now()}`;
  await page.goto("/");
  await addHabit(page, name);
  const row = rowFor(page, name);

  await rowButton(row, "Check in").click();

  await expect(rowButton(row, "Done today")).toBeVisible();
  await expect(row).toContainText("1 day streak");
});

test("double check-in: repeat check-in stays at 1 day streak after reload", async ({ page, request }) => {
  const name = `Double check-in ${Date.now()}`;
  await page.goto("/");
  await addHabit(page, name);
  const row = rowFor(page, name);
  await rowButton(row, "Check in").click();
  await expect(row).toContainText("1 day streak");

  const habits = await (await request.get("/api/habits")).json();
  const habit = habits.find((h: { name: string }) => h.name === name);
  const repeatResponse = await request.post(`/api/habits/${habit.id}/check-ins`);
  expect(repeatResponse.status()).toBe(200);

  await page.reload();
  await expect(rowFor(page, name)).toContainText("1 day streak");
});

test("delete: row disappears and stays gone after reload", async ({ page }) => {
  const name = `Delete ${Date.now()}`;
  await page.goto("/");
  await addHabit(page, name);
  const row = rowFor(page, name);

  await rowButton(row, "Delete").click();

  await expect(row).toHaveCount(0);
  await page.reload();
  await expect(rowFor(page, name)).toHaveCount(0);
});

test("blank name: shows an alert and adds no row", async ({ page }) => {
  await page.goto("/");
  const rowCountBefore = await page.getByRole("listitem").count();

  await addHabit(page, "   ");

  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("listitem")).toHaveCount(rowCountBefore);
});

test("first-load failure: shows an alert when the habits list fails to load", async ({ page }) => {
  await page.route("**/api/habits", (route) => {
    if (route.request().method() === "GET") {
      route.fulfill({ status: 500, json: { error: "Internal server error" } });
    } else {
      route.continue();
    }
  });

  await page.goto("/");

  // filter out Next's own hidden route-announcer, which also has role="alert"
  await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toBeVisible();
});
