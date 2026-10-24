import { test, expect, type Page } from "@playwright/test";

async function addHabit(page: Page, name: string) {
  await page.getByLabel("Habit name").fill(name);
  await page.getByRole("button", { name: "Add" }).click();
}

function rowFor(page: Page, name: string) {
  return page.getByRole("listitem").filter({ hasText: name });
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

  await row.getByRole("button", { name: "Check in" }).click();

  await expect(row.getByRole("button", { name: "Done today" })).toBeVisible();
  await expect(row).toContainText("1 day streak");
});

test("double check-in: repeat check-in stays at 1 day streak after reload", async ({ page, request }) => {
  const name = `Double check-in ${Date.now()}`;
  await page.goto("/");
  await addHabit(page, name);
  const row = rowFor(page, name);
  await row.getByRole("button", { name: "Check in" }).click();
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

  await row.getByRole("button", { name: "Delete" }).click();

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
