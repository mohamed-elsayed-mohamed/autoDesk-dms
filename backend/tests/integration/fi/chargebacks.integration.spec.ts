/**
 * Integration tests for F&I Chargeback Tracking API — US4
 * Run against a test DB with:
 *   DATABASE_URL=<test-db-url> npm run test:integration
 *
 * Prerequisites: FniManager and Controller users seeded; a funded deal with an Active FIProduct.
 * Chargeback is exempt from deal-status restrictions — allowed on deals in ANY pipeline status.
 */

describe('F&I Chargeback Tracking API — US4', () => {
  describe('POST /api/deals/:dealId/fi-products/:productId/chargeback', () => {
    it('should record chargeback on an Active product on a Funded deal (FniManager role)', () => {
      // Arrange: deal in Funded status, VSC product with status=Active, gross=$700
      // Act: POST { chargebackAmount: 600, chargebackDate: "2026-04-01" } as FniManager
      // Assert:
      //   - 200
      //   - product.status === "ChargedBack"
      //   - product.chargebackAmount === 600
      //   - product.chargebackDate === "2026-04-01"
      //   - product.chargebackRecordedById === FniManager.id
    });

    it('should record chargeback on an Active product on a Funded deal (Controller role)', () => {
      // Arrange: deal in Funded status, GAP product with status=Active
      // Act: POST { chargebackAmount: 495, chargebackDate: "2026-04-15" } as Controller
      // Assert: 200, product.status === "ChargedBack"
    });

    it('should decrease deal backEndGross by the charged-back product gross contribution', () => {
      // Arrange: deal with VSC (cost=800, selling=1500, gross=$700) only active product
      //   backEndGross before = $700
      // Act: record chargeback on VSC
      // Assert:
      //   - deal.backEndGross = $0 (CHARGED_BACK excluded from calculateFiGross per FR-016)
    });

    it('should create audit log entry ChargebackRecorded', () => {
      // Assert: GET /api/deals/:dealId/fi-audit-log has ChargebackRecorded entry
      //         entry.entityType === "FIProduct", entry.entityId === productId
    });

    it('should allow chargeback on deal in Fni status (not just Funded)', () => {
      // Arrange: deal in Fni status, Active product
      // Act: POST chargeback
      // Assert: 200
    });

    it('should allow chargeback on deal in Pending status', () => {
      // Arrange: deal in Pending status, Active product
      // Act: POST chargeback
      // Assert: 200 (no deal-status restriction for chargebacks)
    });

    it('should return 422 when attempting chargeback on a Cancelled product', () => {
      // Arrange: product with status=Cancelled
      // Act: POST chargeback
      // Assert: 422 (product must be Active to chargeback)
    });

    it('should return 422 when attempting chargeback on an already ChargedBack product', () => {
      // Arrange: product with status=ChargedBack
      // Act: POST chargeback
      // Assert: 422
    });

    it('should return 403 when SalesManager attempts to record chargeback', () => {
      // Act: POST with SalesManager JWT
      // Assert: 403
    });
  });
});
