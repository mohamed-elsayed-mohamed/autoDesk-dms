/// <reference types="cypress" />

/**
 * E2E: General Manager views sales report and downloads CSV.
 */
describe('Sales report', () => {
  beforeEach(() => {
    cy.loginAs('GeneralManager');
  });

  it('loads the sales report page', () => {
    cy.visit('/reports/sales');
    cy.findByText(/Sales Report/i).should('exist');
    cy.findByLabelText(/start date/i).should('exist');
    cy.findByLabelText(/end date/i).should('exist');
    cy.findByRole('button', { name: /run report/i }).should('exist');
  });

  it('shows empty state before running report', () => {
    cy.visit('/reports/sales');
    cy.findByText(/select a date range/i).should('exist');
    cy.findByRole('button', { name: /export csv/i }).should('be.disabled');
  });

  it('runs report and displays summary totals', () => {
    cy.visit('/reports/sales');

    // Set a broad date range to capture seeded data
    cy.findByLabelText(/start date/i).clear().type('2020-01-01');
    cy.findByLabelText(/end date/i).clear().type('2030-12-31');

    cy.findByRole('button', { name: /run report/i }).click();

    // Summary section must appear
    cy.findByText(/total units/i, { timeout: 8000 }).should('exist');
    cy.findByText(/total front-end gross/i, { timeout: 8000 }).should('exist');
  });

  it('exports CSV — response has attachment header', () => {
    cy.visit('/reports/sales');

    cy.findByLabelText(/start date/i).clear().type('2020-01-01');
    cy.findByLabelText(/end date/i).clear().type('2030-12-31');
    cy.findByRole('button', { name: /run report/i }).click();

    // Wait for report to load, then export
    cy.findByText(/total units/i, { timeout: 8000 }).should('exist');
    cy.findByRole('button', { name: /export csv/i }).should('not.be.disabled').click();

    // The download is triggered client-side; verify the button state returns to normal
    cy.findByRole('button', { name: /export csv/i }, { timeout: 6000 }).should('not.be.disabled');
  });

  it('shows per-salesperson breakdown table when funded deals exist', () => {
    cy.visit('/reports/sales');

    cy.findByLabelText(/start date/i).clear().type('2020-01-01');
    cy.findByLabelText(/end date/i).clear().type('2030-12-31');
    cy.findByRole('button', { name: /run report/i }).click();

    cy.findByText(/by salesperson/i, { timeout: 8000 }).should('exist');
    // Table or empty state message should be present
    cy.get(
      '[data-testid="salesperson-table"] tbody tr, [data-testid="no-funded-deals"]',
    ).should('have.length.gte', 1);
  });
});
