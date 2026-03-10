/**
 * Integration tests for F&I Disclosures API — US5
 * Run against a test DB with:
 *   DATABASE_URL=<test-db-url> npm run test:integration
 *
 * Prerequisites: FniManager and SalesManager users seeded; DisclosureRequirement records
 * seeded for jurisdiction "US-DEFAULT"; a deal in Fni status.
 */

describe('F&I Disclosures API — US5', () => {
  describe('GET /api/fi/disclosure-requirements', () => {
    it('should return all active disclosure requirements for jurisdiction US-DEFAULT', () => {
      // Assert: 200, array with disclosureName, jurisdiction, isActive=true
      //         inactive requirements NOT in the list
    });

    it('should return 200 for FniManager', () => {
      // Assert: 200
    });

    it('should return 200 for SalesManager (read-only)', () => {
      // Assert: 200
    });
  });

  describe('GET /api/deals/:dealId/disclosures (get confirmation status)', () => {
    it('should return requirements + confirmations + isComplete=false before any confirmations', () => {
      // Arrange: deal with 2 disclosure requirements, none confirmed
      // Assert:
      //   - 200
      //   - response.requirements.length === 2
      //   - response.confirmations.length === 0
      //   - response.isComplete === false
    });

    it('should return isComplete=true after all requirements confirmed', () => {
      // Arrange: both disclosures confirmed on this deal
      // Assert: response.isComplete === true, confirmations.length === 2
    });

    it('should return 200 for SalesManager (read-only)', () => {
      // Assert: 200, confirmation data visible but no confirm action allowed
    });
  });

  describe('POST /api/deals/:dealId/disclosures/confirm', () => {
    it('should create a DisclosureConfirmation with actor name, role, and date snapshots', () => {
      // Arrange: deal in Fni status, 2 unconfirmed requirements
      // Act: POST { disclosureRequirementId: requirementId1 } as FniManager
      // Assert:
      //   - 200 (or 201)
      //   - response.disclosureName === snapshotted name from requirement
      //   - response.confirmedByName === FniManager's name (snapshot, not live)
      //   - response.confirmedByRole === "FniManager" (snapshot)
      //   - response.confirmedAt is a valid ISO date
    });

    it('should be idempotent — confirming the same disclosure twice returns the existing record', () => {
      // Act: POST confirm twice for the same disclosureRequirementId
      // Assert: second POST returns 200 with the same confirmation record (no duplicate created)
      //         GET /api/deals/:dealId/disclosures shows only 1 confirmation for this disclosure
    });

    it('should create audit log entry DisclosureConfirmed', () => {
      // Assert: GET /api/deals/:dealId/fi-audit-log has DisclosureConfirmed entry
      //         entry.entityType === "DisclosureConfirmation"
    });

    it('should return 403 when SalesManager attempts to confirm', () => {
      // Act: POST with SalesManager JWT
      // Assert: 403
    });

    it('should show isComplete=true after confirming all requirements', () => {
      // Act: confirm requirement1, then requirement2
      // Assert: GET /api/deals/:dealId/disclosures → isComplete === true
    });
  });

  describe('Immutability — no DELETE endpoint for DisclosureConfirmation', () => {
    it('should return 404 or 405 when attempting to DELETE a disclosure confirmation', () => {
      // Arrange: existing DisclosureConfirmation
      // Act: DELETE /api/deals/:dealId/disclosures/:confirmationId
      // Assert: 404 or 405 (no delete endpoint exposed)
    });
  });
});
