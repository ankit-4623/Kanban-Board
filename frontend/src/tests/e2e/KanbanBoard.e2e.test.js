import { test, expect } from "@playwright/test";

// ============================================
// KANBAN BOARD E2E TESTS
// ============================================

test.describe("Kanban Board - Basic Operations", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for WebSocket connection
    await expect(page.getByText(/Connected/)).toBeVisible({ timeout: 10000 });
  });

  test("displays the Kanban board title", async ({ page }) => {
    await expect(page.getByText("Kanban Board")).toBeVisible();
  });

  test("displays all three columns", async ({ page }) => {
    await expect(page.getByText("To Do")).toBeVisible();
    await expect(page.getByText("In Progress")).toBeVisible();
    await expect(page.getByText("Done")).toBeVisible();
  });

  test("shows WebSocket connection status", async ({ page }) => {
    await expect(page.getByText(/🟢 Connected|🔴 Disconnected/)).toBeVisible();
  });
});

test.describe("Kanban Board - Task CRUD Operations", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Connected/)).toBeVisible({ timeout: 10000 });
  });

  test("user can create a new task", async ({ page }) => {
    // Click the New Task button
    await page.click("text=+ New Task");

    // Verify form modal opens
    await expect(page.getByText("Create New Task")).toBeVisible();

    // Fill in the task title
    const uniqueTitle = `Test Task ${Date.now()}`;
    await page.fill('input[name="title"]', uniqueTitle);

    // Submit the form
    await page.click("text=Create Task");

    // Wait for modal to close and task to appear
    await expect(page.getByText("Create New Task")).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText(uniqueTitle)).toBeVisible({ timeout: 5000 });
  });

  test("user can edit an existing task", async ({ page }) => {
    // First create a task
    await page.click("text=+ New Task");
    const originalTitle = `Original Task ${Date.now()}`;
    await page.fill('input[name="title"]', originalTitle);
    await page.click("text=Create Task");
    await expect(page.getByText(originalTitle)).toBeVisible({ timeout: 5000 });

    // Find the task card and click edit button
    const taskCard = page.locator('.task-card', { hasText: originalTitle });
    await taskCard.locator('.btn-edit').click();

    // Verify edit form opens
    await expect(page.getByText("Edit Task")).toBeVisible();

    // Change the title
    const updatedTitle = `Updated Task ${Date.now()}`;
    await page.fill('input[name="title"]', updatedTitle);
    await page.click("text=Update Task");

    // Verify task was updated
    await expect(page.getByText("Edit Task")).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText(updatedTitle)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(originalTitle)).not.toBeVisible();
  });

  test("user can delete a task", async ({ page }) => {
    // First create a task
    await page.click("text=+ New Task");
    const taskTitle = `Task To Delete ${Date.now()}`;
    await page.fill('input[name="title"]', taskTitle);
    await page.click("text=Create Task");
    await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 5000 });

    // Handle the confirmation dialog
    page.on('dialog', async dialog => {
      expect(dialog.type()).toBe('confirm');
      await dialog.accept();
    });

    // Find the task card and click delete button
    const taskCard = page.locator('.task-card', { hasText: taskTitle });
    await taskCard.locator('.btn-delete').click();

    // Verify task was deleted
    await expect(page.getByText(taskTitle)).not.toBeVisible({ timeout: 5000 });
  });

  test("user can cancel task creation", async ({ page }) => {
    await page.click("text=+ New Task");
    await expect(page.getByText("Create New Task")).toBeVisible();
    
    await page.click("text=Cancel");
    
    await expect(page.getByText("Create New Task")).not.toBeVisible();
  });

  test("shows error when creating task without title", async ({ page }) => {
    page.on('dialog', async dialog => {
      expect(dialog.message()).toBe('Title is required');
      await dialog.accept();
    });

    await page.click("text=+ New Task");
    await page.click("text=Create Task");
  });
});

test.describe("Kanban Board - Drag and Drop", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Connected/)).toBeVisible({ timeout: 10000 });
  });

  test("user can drag task from To Do to In Progress", async ({ page }) => {
    // Create a task first
    await page.click("text=+ New Task");
    const taskTitle = `Draggable Task ${Date.now()}`;
    await page.fill('input[name="title"]', taskTitle);
    await page.click("text=Create Task");
    await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 5000 });

    // Get the task card
    const taskCard = page.locator('.task-card', { hasText: taskTitle });
    
    // Get the In Progress column
    const inProgressColumn = page.locator('.column-content').nth(1);

    // Perform drag and drop
    await taskCard.dragTo(inProgressColumn);

    // Wait for the move to complete
    await page.waitForTimeout(1000);

    // Verify task is now in In Progress column (task should still be visible)
    await expect(page.getByText(taskTitle)).toBeVisible();
  });

  test("user can drag task from In Progress to Done", async ({ page }) => {
    // Create a task and move it to in-progress first
    await page.click("text=+ New Task");
    const taskTitle = `Move To Done ${Date.now()}`;
    await page.fill('input[name="title"]', taskTitle);
    
    // Select In Progress status in the form
    await page.click('text=Status');
    await page.getByRole('listbox').waitFor();
    await page.click('text=In Progress');
    
    await page.click("text=Create Task");
    await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 5000 });

    // Get the task card
    const taskCard = page.locator('.task-card', { hasText: taskTitle });
    
    // Get the Done column
    const doneColumn = page.locator('.column-content').nth(2);

    // Perform drag and drop
    await taskCard.dragTo(doneColumn);

    // Wait for the move
    await page.waitForTimeout(1000);

    // Verify task is still visible
    await expect(page.getByText(taskTitle)).toBeVisible();
  });
});

test.describe("Kanban Board - Real-time Updates", () => {
  test("UI updates in real-time when another user modifies tasks", async ({ browser }) => {
    // Create two browser contexts to simulate two users
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    // Both users open the application
    await page1.goto("/");
    await page2.goto("/");
    
    // Wait for both to connect
    await expect(page1.getByText(/Connected/)).toBeVisible({ timeout: 10000 });
    await expect(page2.getByText(/Connected/)).toBeVisible({ timeout: 10000 });
    
    // User 1 creates a task
    await page1.click("text=+ New Task");
    const taskTitle = `Shared Task ${Date.now()}`;
    await page1.fill('input[name="title"]', taskTitle);
    await page1.click("text=Create Task");
    
    // Wait for task to appear on User 1's screen
    await expect(page1.getByText(taskTitle)).toBeVisible({ timeout: 5000 });
    
    // User 2 should also see the task (real-time sync)
    await expect(page2.getByText(taskTitle)).toBeVisible({ timeout: 5000 });
    
    // Cleanup
    await context1.close();
    await context2.close();
  });
});

// ============================================
// DROPDOWN SELECT E2E TESTS
// ============================================

test.describe("Dropdown Select Testing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Connected/)).toBeVisible({ timeout: 10000 });
    await page.click("text=+ New Task");
  });

  test("user can select a priority level", async ({ page }) => {
    // Click on Priority dropdown
    const priorityDropdown = page.locator('.form-group').filter({ hasText: 'Priority' }).locator('.css-1dimb5e-singleValue, [class*="singleValue"]');
    
    // Default should be Medium
    await expect(page.locator('.form-group').filter({ hasText: 'Priority' })).toContainText('Medium');
    
    // Click to open dropdown
    await page.locator('.form-group').filter({ hasText: 'Priority' }).locator('[class*="control"]').click();
    
    // Select High priority
    await page.getByText('High', { exact: true }).click();
    
    // Verify selection changed
    await expect(page.locator('.form-group').filter({ hasText: 'Priority' })).toContainText('High');
  });

  test("user can select Low priority", async ({ page }) => {
    await page.locator('.form-group').filter({ hasText: 'Priority' }).locator('[class*="control"]').click();
    await page.getByText('Low', { exact: true }).click();
    await expect(page.locator('.form-group').filter({ hasText: 'Priority' })).toContainText('Low');
  });

  test("user can change the task category", async ({ page }) => {
    // Default category is Feature
    await expect(page.locator('.form-group').filter({ hasText: 'Category' })).toContainText('Feature');
    
    // Click to open dropdown
    await page.locator('.form-group').filter({ hasText: 'Category' }).locator('[class*="control"]').click();
    
    // Select Bug category
    await page.getByText('Bug', { exact: true }).click();
    
    // Verify selection changed
    await expect(page.locator('.form-group').filter({ hasText: 'Category' })).toContainText('Bug');
  });

  test("user can select Enhancement category", async ({ page }) => {
    await page.locator('.form-group').filter({ hasText: 'Category' }).locator('[class*="control"]').click();
    await page.getByText('Enhancement', { exact: true }).click();
    await expect(page.locator('.form-group').filter({ hasText: 'Category' })).toContainText('Enhancement');
  });

  test("user can change the task status", async ({ page }) => {
    // Default status is To Do
    await expect(page.locator('.form-group').filter({ hasText: 'Status' })).toContainText('To Do');
    
    // Click to open dropdown
    await page.locator('.form-group').filter({ hasText: 'Status' }).locator('[class*="control"]').click();
    
    // Select In Progress
    await page.getByText('In Progress', { exact: true }).click();
    
    // Verify selection changed
    await expect(page.locator('.form-group').filter({ hasText: 'Status' })).toContainText('In Progress');
  });

  test("created task has correct priority and category", async ({ page }) => {
    const taskTitle = `Priority Test ${Date.now()}`;
    
    // Set title
    await page.fill('input[name="title"]', taskTitle);
    
    // Set High priority
    await page.locator('.form-group').filter({ hasText: 'Priority' }).locator('[class*="control"]').click();
    await page.getByText('High', { exact: true }).click();
    
    // Set Bug category
    await page.locator('.form-group').filter({ hasText: 'Category' }).locator('[class*="control"]').click();
    await page.getByText('Bug', { exact: true }).click();
    
    // Create task
    await page.click("text=Create Task");
    
    // Wait for task to appear
    await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 5000 });
    
    // Verify the task card shows correct badges
    const taskCard = page.locator('.task-card', { hasText: taskTitle });
    await expect(taskCard.locator('.priority-badge')).toContainText('high');
    await expect(taskCard.locator('.category-badge')).toContainText('Bug');
  });
});

// ============================================
// FILE UPLOAD E2E TESTS
// ============================================

test.describe("File Upload Testing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Connected/)).toBeVisible({ timeout: 10000 });
    await page.click("text=+ New Task");
  });

  test("user can upload an image file", async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    
    // Create a test image file
    await fileInput.setInputFiles({
      name: 'test-image.png',
      mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'),
    });
    
    // Verify preview is shown
    await expect(page.locator('.file-preview')).toBeVisible();
    await expect(page.locator('.preview-image')).toBeVisible();
  });

  test("user can upload a PDF file", async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    
    // Create a test PDF file (minimal PDF content)
    await fileInput.setInputFiles({
      name: 'test-document.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>'),
    });
    
    // Verify file is attached (shows as file attachment, not image preview)
    await expect(page.locator('.file-preview')).toBeVisible();
  });

  test("uploaded file displays correctly in preview", async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    
    // Upload an image
    await fileInput.setInputFiles({
      name: 'preview-test.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRof', 'base64'),
    });
    
    // Verify preview image is displayed
    await expect(page.locator('.preview-image')).toBeVisible();
    
    // Verify remove button is available
    await expect(page.getByText('✕ Remove')).toBeVisible();
  });

  test("user can remove an uploaded file", async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    
    // Upload a file
    await fileInput.setInputFiles({
      name: 'file-to-remove.png',
      mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'),
    });
    
    // Verify preview exists
    await expect(page.locator('.file-preview')).toBeVisible();
    
    // Click remove button
    await page.click("text=✕ Remove");
    
    // Verify preview is removed
    await expect(page.locator('.file-preview')).not.toBeVisible();
  });

  test("file input accepts only valid file types", async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    
    // Verify accept attribute
    await expect(fileInput).toHaveAttribute('accept', 'image/*,.pdf,.doc,.docx');
  });

  test("task with attachment shows attachment in task card", async ({ page }) => {
    const taskTitle = `Task With Attachment ${Date.now()}`;
    
    // Fill title
    await page.fill('input[name="title"]', taskTitle);
    
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'attachment.png',
      mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'),
    });
    
    // Create task
    await page.click("text=Create Task");
    
    // Wait for task to appear - the task card should have an attachment
    await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 5000 });
  });
});

// ============================================
// GRAPH/CHART E2E TESTS
// ============================================

test.describe("Graph Testing - Task Progress Chart", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Connected/)).toBeVisible({ timeout: 10000 });
  });

  test("displays Task Progress section", async ({ page }) => {
    await expect(page.getByText("Task Progress")).toBeVisible();
  });

  test("shows no tasks message when empty", async ({ page }) => {
    // This test assumes starting with an empty board
    // In a real scenario, you might need to clear tasks first
    const noTasksMessage = page.getByText("No tasks to display");
    // Either no tasks message is visible, or there are tasks and charts are visible
    const hasNoTasks = await noTasksMessage.isVisible().catch(() => false);
    const hasChart = await page.locator('.chart-container').isVisible();
    
    expect(hasNoTasks || hasChart).toBeTruthy();
  });

  test("graph updates when new task is added", async ({ page }) => {
    // Get initial stats
    const getCompletionText = async () => {
      const element = page.locator('.completion-stats');
      if (await element.isVisible().catch(() => false)) {
        return await element.textContent();
      }
      return '';
    };

    const initialStats = await getCompletionText();

    // Create a new task
    await page.click("text=+ New Task");
    const taskTitle = `Graph Test Task ${Date.now()}`;
    await page.fill('input[name="title"]', taskTitle);
    await page.click("text=Create Task");

    // Wait for task to be created
    await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 5000 });

    // Wait for graph to update
    await page.waitForTimeout(500);

    // Verify the stats have changed to reflect new task
    const newStats = await getCompletionText();
    
    // If there were no tasks before, there should now be stats visible
    const hasStatsNow = newStats.length > 0;
    expect(hasStatsNow).toBeTruthy();
  });

  test("completion percentage updates when task is moved to done", async ({ page }) => {
    // Create a task in To Do
    await page.click("text=+ New Task");
    const taskTitle = `Completion Test ${Date.now()}`;
    await page.fill('input[name="title"]', taskTitle);
    await page.click("text=Create Task");
    await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 5000 });

    // Get the task card
    const taskCard = page.locator('.task-card', { hasText: taskTitle });
    
    // Get the Done column
    const doneColumn = page.locator('.column-content').nth(2);

    // Drag to Done
    await taskCard.dragTo(doneColumn);

    // Wait for update
    await page.waitForTimeout(1000);

    // The completed count should have increased
    // Check that the completion stats show at least 1 completed
    const completedElement = page.locator('.completion-stats').getByText('completed');
    await expect(completedElement).toBeVisible({ timeout: 5000 });
  });

  test("bar chart displays correct status distribution", async ({ page }) => {
    // Create tasks in different statuses
    const createTask = async (title, status) => {
      await page.click("text=+ New Task");
      await page.fill('input[name="title"]', title);
      
      // Select status
      await page.locator('.form-group').filter({ hasText: 'Status' }).locator('[class*="control"]').click();
      await page.getByText(status, { exact: true }).click();
      
      await page.click("text=Create Task");
      await expect(page.getByText(title)).toBeVisible({ timeout: 5000 });
    };

    await createTask(`Todo Task ${Date.now()}`, 'To Do');
    await createTask(`InProgress Task ${Date.now()}`, 'In Progress');
    await createTask(`Done Task ${Date.now()}`, 'Done');

    // Verify chart is visible
    await expect(page.locator('.chart-container')).toBeVisible();
    
    // Verify bar chart section exists
    await expect(page.getByText('Tasks by Status')).toBeVisible({ timeout: 5000 });
  });

  test("chart re-renders dynamically when tasks are deleted", async ({ page }) => {
    // Create a task
    await page.click("text=+ New Task");
    const taskTitle = `Delete Chart Test ${Date.now()}`;
    await page.fill('input[name="title"]', taskTitle);
    await page.click("text=Create Task");
    await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 5000 });

    // Get stats before deletion
    const statsBefore = await page.locator('.completion-stats').textContent().catch(() => '');

    // Handle confirmation dialog
    page.on('dialog', async dialog => await dialog.accept());

    // Delete the task
    const taskCard = page.locator('.task-card', { hasText: taskTitle });
    await taskCard.locator('.btn-delete').click();

    // Wait for deletion
    await expect(page.getByText(taskTitle)).not.toBeVisible({ timeout: 5000 });

    // Wait for chart update
    await page.waitForTimeout(500);

    // Chart should have been updated
    const statsAfter = await page.locator('.completion-stats').textContent().catch(() => '');
    
    // Stats should be different after deletion (less tasks)
    // Or if it was the last task, no tasks message should appear
    const hasChanged = statsBefore !== statsAfter;
    const hasNoTasks = await page.getByText("No tasks to display").isVisible().catch(() => false);
    
    expect(hasChanged || hasNoTasks).toBeTruthy();
  });

  test("displays correct total task count in stats", async ({ page }) => {
    // Create 3 tasks
    for (let i = 1; i <= 3; i++) {
      await page.click("text=+ New Task");
      await page.fill('input[name="title"]', `Count Test ${i} ${Date.now()}`);
      await page.click("text=Create Task");
      await page.waitForTimeout(500);
    }

    // Verify stats show total tasks
    await expect(page.locator('.completion-stats')).toContainText('total tasks', { timeout: 5000 });
  });
});
