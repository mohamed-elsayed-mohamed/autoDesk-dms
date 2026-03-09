/// <reference types="cypress" />

/**
 * E2E: Sales Consultant creates Finance deal with trade-in and fees,
 * generates buyer's order, verifies financial fields in the document list.
 */
describe('Desking flow — Finance deal with trade-in and fees', () => {
  before(() => {
    cy.loginAs('SalesConsultant');
  });

  beforeEach(() => {
    cy.loginAs('SalesConsultant');
  });

  it('creates a new Finance deal', () => {
    cy.visit('/deals/new');

    // Customer picker — select the first result
    cy.findByLabelText(/customer/i, { exact: false })
      .should('exist')
      .type('John');
    cy.get('[data-testid="customer-option"]').first().click();

    // Vehicle picker — select the first available vehicle
    cy.findByLabelText(/vehicle/i, { exact: false }).type('');
    cy.get('[data-testid="vehicle-option"]').first().click();

    // Deal type
    cy.get('[data-testid="deal-type-select"]').click();
    cy.findByRole('option', { name: /Finance/i }).click();

    cy.findByRole('button', { name: /create deal/i }).click();

    // Should land on desking page
    cy.url().should('match', /\/deals\/[0-9a-f-]+$/);
    cy.findByText(/Deal #/i).should('exist');
  });

  it('desks the deal with sale price, APR, term, and tax rate', () => {
    // Assumes we are on a desking page from a prior create
    cy.visit('/deals');
    cy.get('[data-testid="deal-row"]').first().click();

    cy.get('[data-testid="input-salePrice"]').clear().type('35000');
    cy.get('[data-testid="input-downPayment"]').clear().type('5000');
    cy.get('[data-testid="input-apr"]').clear().type('6.99');
    cy.get('[data-testid="input-term"]').clear().type('60');
    cy.get('[data-testid="input-taxRate"]').clear().type('8.5');

    cy.findByRole('button', { name: /recalculate|update/i }).click();

    // Monthly payment should appear
    cy.get('[data-testid="monthly-payment"]').should('contain', '$');
  });

  it('adds a documentation fee', () => {
    cy.visit('/deals');
    cy.get('[data-testid="deal-row"]').first().click();

    cy.findByRole('button', { name: /add fee/i }).click();
    cy.get('[data-testid="fee-name-input"]').type('Documentation Fee');
    cy.get('[data-testid="fee-amount-input"]').type('499');
    cy.get('[data-testid="fee-taxable-checkbox"]').check();
    cy.findByRole('button', { name: /save|add/i }).click();

    cy.findByText('Documentation Fee').should('exist');
  });

  it('adds a trade-in', () => {
    cy.visit('/deals');
    cy.get('[data-testid="deal-row"]').first().click();

    cy.findByRole('button', { name: /add trade-?in/i }).click();
    cy.get('[data-testid="trade-year"]').clear().type('2019');
    cy.get('[data-testid="trade-make"]').clear().type('Honda');
    cy.get('[data-testid="trade-model"]').clear().type('Accord');
    cy.get('[data-testid="trade-mileage"]').clear().type('55000');
    cy.get('[data-testid="trade-acv"]').clear().type('12000');
    cy.get('[data-testid="trade-allowance"]').clear().type('12500');
    cy.get('[data-testid="trade-payoff"]').clear().type('8000');

    cy.findByRole('button', { name: /save/i }).click();
    cy.findByText(/Honda Accord/i).should('exist');
  });

  it('navigates to deal jacket and generates a buyer\'s order', () => {
    cy.visit('/deals');
    cy.get('[data-testid="deal-row"]').first().within(() => {
      cy.findByRole('link', { name: /jacket/i }).click();
    });

    // Generate Buyer's Order
    cy.get('[data-testid="doc-type-select"]').should('exist');
    cy.findByRole('button', { name: /generate/i }).click();

    // Document row should appear
    cy.findByText(/Buyer's Order/i).should('exist');
    cy.findByRole('link', { name: /download/i }).should('exist');
  });
});
