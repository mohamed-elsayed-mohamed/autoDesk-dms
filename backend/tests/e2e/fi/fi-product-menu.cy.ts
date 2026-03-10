/**
 * Cypress E2E: F&I Product Menu — T069
 *
 * Prerequisites:
 *   - A deal in F&I status with a selected lender decision
 *   - F&I Manager user seeded
 *   - Active product catalog items (VSC, GAP) available
 *
 * Run with:
 *   npx cypress run --spec tests/e2e/fi/fi-product-menu.cy.ts
 */

describe('F&I Product Menu', () => {
  describe('Adding products and verifying gross', () => {
    it('F&I Manager adds VSC and GAP products and sees correct total gross within 1 second', () => {
      // Arrange: log in as F&I Manager, navigate to F&I-status deal → Product Menu tab
      // Act: click "Add Product"
      //      select productType = VSC from catalog dropdown
      //      fill providerName = "CarMax VSC", cost = 800, sellingPrice = 1500, termMonths = 36
      //      click "Add"
      // Assert:
      //   - product appears in table with status badge "Active"
      //   - total F&I gross shows $700.00 within 1 second of adding

      // Act: add second product
      //      productType = GAP, providerName = "Safe-Guard", cost = 200, sellingPrice = 695
      //      click "Add"
      // Assert:
      //   - total F&I gross shows $1,195.00 ($700 + $495) within 1 second
      //   - deal's back-end gross field in deal jacket header = $1,195.00
    });

    it('product table shows correct status badges for each product', () => {
      // Assert: VSC row shows green "Active" badge
      //         GAP row shows green "Active" badge
      //         edit and remove buttons visible for both
    });
  });

  describe('Chargeback', () => {
    it('F&I Manager marks VSC as charged back and status badge changes', () => {
      // Arrange: deal with active VSC product
      // Act: click "Chargeback" on VSC row
      //      enter chargebackAmount = 750, chargebackDate = today
      //      click "Confirm Chargeback" in the confirmation step
      // Assert:
      //   - VSC row status badge changes to red "Charged Back"
      //   - total F&I gross recalculates to $495.00 (only GAP active: 695 - 200)
      //   - edit/remove actions for VSC are now disabled
    });

    it('chargeback form requires both amount and date', () => {
      // Act: open chargeback modal, clear amount, attempt submit
      // Assert: validation error visible; form does not submit
    });
  });

  describe('Remove product', () => {
    it('F&I Manager can remove an Active product and gross updates', () => {
      // Arrange: deal with VSC (Active)
      // Act: click "Remove" → confirm
      // Assert: VSC row gone, total gross decreases accordingly
    });
  });
});
