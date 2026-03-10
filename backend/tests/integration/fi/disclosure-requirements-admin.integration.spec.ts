/**
 * Integration tests for Disclosure Requirement Admin CRUD — T081
 * Run against a test DB with:
 *   DATABASE_URL=<test-db-url> npm run test:integration
 *
 * Prerequisites: Administrator user seeded; FniManager and SalesManager users seeded.
 * Deactivating a requirement must preserve existing DisclosureConfirmation records.
 */

describe('Disclosure Requirement Admin CRUD', () => {
  describe('POST /api/fi/disclosure-requirements (Admin only)', () => {
    it('should create a new disclosure requirement and return 201', () => {
      // Arrange: { jurisdiction: "US-CA", disclosureName: "California Red Book", isActive: true }
      // Act: POST as Administrator
      // Assert:
      //   - 201
      //   - response.id is a valid UUID
      //   - response.disclosureName === "California Red Book"
      //   - response.jurisdiction === "US-CA"
    });

    it('should default isActive=true when not provided', () => {
      // Act: POST { jurisdiction: "US-TX", disclosureName: "Texas Disclosure" }
      // Assert: 201, response.isActive === true
    });

    it('should return 403 when FniManager attempts to create a requirement', () => {
      // Act: POST as FniManager
      // Assert: 403
    });

    it('should return 403 when SalesManager attempts to create a requirement', () => {
      // Act: POST as SalesManager
      // Assert: 403
    });
  });

  describe('PATCH /api/fi/disclosure-requirements/:id (Admin only)', () => {
    it('should update disclosureName and return 200', () => {
      // Arrange: existing requirement
      // Act: PATCH { disclosureName: "Updated Disclosure Name" }
      // Assert: 200, response.disclosureName === "Updated Disclosure Name"
    });

    it('should set isActive=false and exclude from active list', () => {
      // Arrange: active requirement
      // Act: PATCH { isActive: false }
      // Assert: 200, GET /api/fi/disclosure-requirements does NOT include this requirement
    });

    it('should preserve existing DisclosureConfirmation records when requirement is deactivated', () => {
      // Arrange: requirement with an existing confirmation on a deal
      // Act: PATCH { isActive: false } on the requirement
      // Assert: DisclosureConfirmation record STILL EXISTS in DB (not deleted)
      //         GET /api/deals/:dealId/disclosures still shows the past confirmation
    });

    it('should return 403 when non-Admin attempts to PATCH a requirement', () => {
      // Act: PATCH as FniManager
      // Assert: 403
    });
  });

  describe('GET /api/fi/disclosure-requirements (active list)', () => {
    it('should return only active requirements', () => {
      // Arrange: 2 active, 1 inactive requirement
      // Assert: response length === 2
    });

    it('should be readable by FniManager', () => {
      // Assert: 200
    });

    it('should be readable by SalesManager', () => {
      // Assert: 200
    });
  });
});
