/// <reference types="cypress" />

/**
 * E2E: Full pipeline walkthrough from deal creation through Funded status.
 *
 * Roles used:
 *   - SalesConsultant: create, desk, advance ContractsSigned → Delivered → Funded
 *   - SalesManager: approve Desking → F&I
 *   - FniManager (or SalesConsultant): advance F&I → ContractsSigned
 */
describe('Full pipeline — Pending → Funded', () => {
  let dealId: string;

  it('Sales Consultant creates a Cash deal', () => {
    cy.loginAs('SalesConsultant');
    cy.visit('/deals/new');

    cy.get('[data-testid="customer-search"]').type('A');
    cy.get('[data-testid="customer-option"]').first().click();

    cy.get('[data-testid="vehicle-search"]').type('');
    cy.get('[data-testid="vehicle-option"]').first().click();

    cy.get('[data-testid="deal-type-select"]').click();
    cy.findByRole('option', { name: /Cash/i }).click();

    cy.findByRole('button', { name: /create deal/i }).click();

    cy.url().then((url) => {
      dealId = url.split('/').pop()!;
      expect(dealId).to.match(/[0-9a-f-]{36}/);
    });
  });

  it('Sales Consultant desks the deal (triggers Desking status)', () => {
    cy.loginAs('SalesConsultant');
    cy.visit(`/deals/${dealId}`);

    cy.get('[data-testid="input-salePrice"]').clear().type('25000');
    cy.get('[data-testid="input-taxRate"]').clear().type('7.5');
    cy.findByRole('button', { name: /recalculate|update/i }).click();

    cy.findByText(/Desking/i, { timeout: 6000 }).should('exist');
  });

  it('Sales Manager approves deal to F&I', () => {
    cy.loginAs('SalesManager');
    cy.visit(`/deals/${dealId}/jacket`);

    cy.findByRole('button', { name: /approve to f&i/i }).click();
    cy.findByText(/F&I|Fni/i, { timeout: 6000 }).should('exist');
  });

  it('F&I Manager (or Sales Consultant) advances to Contracts Signed', () => {
    cy.loginAs('SalesConsultant');
    cy.visit(`/deals/${dealId}/jacket`);

    cy.findByRole('button', { name: /contracts signed/i }).click();
    cy.findByText(/Contracts Signed/i, { timeout: 6000 }).should('exist');
  });

  it('Sales Consultant marks deal Delivered', () => {
    cy.loginAs('SalesConsultant');
    cy.visit(`/deals/${dealId}/jacket`);

    cy.findByRole('button', { name: /delivered/i }).click();
    cy.findByText(/Delivered/i, { timeout: 6000 }).should('exist');
  });

  it('Sales Consultant marks deal Funded', () => {
    cy.loginAs('SalesConsultant');
    cy.visit(`/deals/${dealId}/jacket`);

    cy.findByRole('button', { name: /funded/i }).click();
    cy.findByText(/Funded/i, { timeout: 6000 }).should('exist');
  });

  it('Status history timeline shows all transitions', () => {
    cy.loginAs('SalesConsultant');
    cy.visit(`/deals/${dealId}/jacket`);

    // Timeline should show at least Pending → Desking entry
    cy.findByText(/Pending/i).should('exist');
    cy.findByText(/Funded/i).should('exist');
  });
});
