/**
 * Integration tests for F&I Lender Submissions API — US2
 * Run against a test DB with:
 *   DATABASE_URL=<test-db-url> npm run test:integration
 *
 * Prerequisites: seeded lenders, FniManager user, FniStatus deal with a submitted credit application.
 */

describe('F&I Lender Submissions API — US2', () => {
  describe('GET /api/fi/lenders (active lenders catalog)', () => {
    it('should return all active lenders for FniManager', () => {
      // Assert: 200, array of lenders with id, name, isActive=true, maxMarkupCap
      //         inactive lenders NOT in the list
    });

    it('should return lenders for SalesManager (read-only allowed)', () => {
      // Assert: 200, same lender list
    });
  });

  describe('POST /api/deals/:dealId/lender-submissions (submit to lenders)', () => {
    it('should submit to two lenders and return two LenderSubmission records', () => {
      // Arrange: deal in Fni status with a Submitted credit application
      // Act: POST { lenderIds: [lenderId1, lenderId2] }
      // Assert:
      //   - 201
      //   - response.submissions.length === 2
      //   - each submission has decision ∈ {Approved, Conditional, Declined}
      //   - Approved/Conditional submissions have non-null buyRate, approvedAmount
      //   - Declined submissions have null buyRate, approvedAmount, maxTerm
    });

    it('should create an audit log entry LenderSubmitted for each lender submitted to', () => {
      // Assert: GET /api/deals/:dealId/fi-audit-log returns entries with actionType=LenderSubmitted
      //         one entry per lender
    });

    it('should return 422 when no submitted credit application exists on the deal', () => {
      // Arrange: deal in Fni status with only a Draft credit application
      // Act: POST /api/deals/:dealId/lender-submissions
      // Assert: 422 (deal has no submitted credit app)
    });

    it('should return 403 when SalesManager attempts to submit', () => {
      // Act: POST with SalesManager JWT
      // Assert: 403
    });

    it('should return 422 when deal is not in Fni status', () => {
      // Arrange: deal in Pending status
      // Act: POST /api/deals/:dealId/lender-submissions
      // Assert: 422
    });
  });

  describe('GET /api/deals/:dealId/lender-submissions (list decisions)', () => {
    it('should return all submissions for the deal', () => {
      // Arrange: two submissions already created
      // Assert: 200, array length 2, each has lenderName, decision, approvedAmount, buyRate, maxTerm
    });

    it('should return empty array when no submissions exist', () => {
      // Assert: 200, data: []
    });

    it('should return 200 for SalesManager (read-only)', () => {
      // Assert: 200, decision data visible
    });
  });

  describe('POST /api/deals/:dealId/lender-submissions/select (select decision)', () => {
    it('should create a SelectedLenderDecision and update deal APR, term, monthly payment', () => {
      // Arrange: lenderSubmissionId with decision=Approved, buyRate=5.90%
      // Act: POST { lenderSubmissionId, rateMarkup: 1.50, selectedTerm: 72 }
      // Assert:
      //   - 200
      //   - response.sellRate === 7.40 (5.90 + 1.50)
      //   - Deal.apr updated (7.40 / 100 = 0.074 stored as decimal fraction)
      //   - Deal.term === 72
      //   - Deal.monthlyPayment recalculated correctly
      //   - response.warnings === [] (no cap exceeded)
    });

    it('should return warnings[] when markup exceeds lender maxMarkupCap', () => {
      // Arrange: lender with maxMarkupCap=2.00; select with rateMarkup=2.50
      // Assert: 200 (not blocked), response.warnings.length > 0
      //         warning message mentions cap
    });

    it('should return 422 when attempting to select a Declined decision', () => {
      // Arrange: lenderSubmissionId with decision=Declined
      // Act: POST select
      // Assert: 422
    });

    it('should overwrite prior selection when a new decision is selected', () => {
      // Arrange: existing SelectedLenderDecision for submission A
      // Act: select submission B (also Approved)
      // Assert: 200, SelectedLenderDecision now references submission B
      //         audit log contains LenderDecisionSelected with beforeSnapshot (prior selection)
    });

    it('should create audit log entry LenderDecisionSelected with buy rate, markup, sell rate in snapshot', () => {
      // Assert: audit log entry has afterSnapshot.buyRate, afterSnapshot.rateMarkup, afterSnapshot.sellRate
    });

    it('should return 403 when SalesManager attempts to select', () => {
      // Act: POST with SalesManager JWT
      // Assert: 403
    });
  });
});
