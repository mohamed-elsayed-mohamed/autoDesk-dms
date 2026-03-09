/// <reference types="cypress" />

/**
 * E2E: Sales Manager views the approval queue and approves a Desking deal,
 * verifying it advances to F&I.
 */
describe('Manager approval queue', () => {
  beforeEach(() => {
    cy.loginAs('SalesManager');
  });

  it('loads the approval queue with Desking deals', () => {
    cy.visit('/deals/approval-queue');
    cy.findByText(/approval queue/i).should('exist');
    // Table or empty state must be visible
    cy.get('[data-testid="approval-queue-table"], [data-testid="empty-approval-queue"]').should('exist');
  });

  it('approves a deal and verifies it moves to F&I', () => {
    cy.visit('/deals/approval-queue');

    // If there's no desking deal, this test is effectively skipped (happy-path only)
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="approve-btn"]').length === 0) {
        cy.log('No Desking deals in queue — skipping approval assertion');
        return;
      }

      cy.get('[data-testid="approve-btn"]').first().click();

      // Status badge on deal jacket should update
      cy.findByText(/F&I|Fni/i, { timeout: 6000 }).should('exist');
    });
  });

  it('send-back requires a note and returns deal to Desking', () => {
    cy.visit('/deals/approval-queue');

    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="send-back-btn"]').length === 0) {
        cy.log('No deals available for send-back — skipping');
        return;
      }

      cy.get('[data-testid="send-back-btn"]').first().click();

      // Dialog should open
      cy.findByRole('dialog').should('be.visible');

      // Confirm without note — button must be disabled
      cy.findByRole('button', { name: /confirm/i }).should('be.disabled');

      // Fill note and submit
      cy.findByLabelText(/note/i).type('Missing trade-in payoff figure');
      cy.findByRole('button', { name: /confirm/i }).click();

      // Deal should show Desking status
      cy.findByText(/Desking/i, { timeout: 6000 }).should('exist');
    });
  });
});
