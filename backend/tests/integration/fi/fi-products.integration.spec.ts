/**
 * Integration tests for F&I Product Menu API — US3
 * Run against a test DB with:
 *   DATABASE_URL=<test-db-url> npm run test:integration
 *
 * Prerequisites: seeded FniManager user, product catalog items, FniStatus deal.
 */

describe('F&I Product Menu API — US3', () => {
  describe('GET /api/fi/product-catalog', () => {
    it('should return all active catalog items', () => {
      // Assert: 200, array of ProductCatalogItem with productType, providerName, isActive=true
    });

    it('should not return inactive catalog items', () => {
      // Arrange: one inactive item in DB
      // Assert: inactive item absent from response
    });
  });

  describe('POST /api/deals/:dealId/fi-products (add product)', () => {
    it('should add a VSC product and return 201 with the created product', () => {
      // Arrange: deal in Fni status
      // Act: POST { productType: "VSC", providerName: "WarrantyProvider", cost: 800,
      //            sellingPrice: 1500, termMonths: 36 }
      // Assert:
      //   - 201
      //   - response.status === "Active"
      //   - response.gross === 700 (1500 - 800)
    });

    it('should add two products and update deal backEndGross atomically', () => {
      // Arrange: deal in Fni status
      // Act: add VSC (cost=800, selling=1500) then GAP (cost=200, selling=695)
      // Assert:
      //   - GET deal.backEndGross === 1195 (700 + 495)
      //   - Both products in product list with status=Active
    });

    it('should allow negative gross product (cost > sellingPrice)', () => {
      // Act: POST { cost: 500, sellingPrice: 400 }
      // Assert: 201, gross = -100
      //         deal.backEndGross decreases accordingly
    });

    it('should return 422 when adding product to a Delivered deal', () => {
      // Arrange: deal in Delivered status
      // Act: POST /api/deals/:dealId/fi-products
      // Assert: 422
    });

    it('should create audit log entry PRODUCT_ADDED', () => {
      // Assert: GET /api/deals/:dealId/fi-audit-log has ProductAdded entry with entityType=FIProduct
    });

    it('should return 403 when SalesManager attempts to add product', () => {
      // Act: POST with SalesManager JWT
      // Assert: 403
    });
  });

  describe('PATCH /api/deals/:dealId/fi-products/:productId (edit product)', () => {
    it('should update sellingPrice and recalculate deal backEndGross atomically', () => {
      // Arrange: existing VSC product (cost=800, sellingPrice=1500)
      // Act: PATCH { sellingPrice: 1400 }
      // Assert: 200, product.sellingPrice=1400, deal.backEndGross decremented by 100
    });

    it('should capture before/after snapshot in audit log PRODUCT_EDITED', () => {
      // Assert: ProductEdited entry has beforeSnapshot.sellingPrice and afterSnapshot.sellingPrice
    });

    it('should return 422 when editing a Cancelled product', () => {
      // Arrange: product with status=Cancelled
      // Act: PATCH { sellingPrice: 999 }
      // Assert: 422
    });
  });

  describe('DELETE /api/deals/:dealId/fi-products/:productId (remove product)', () => {
    it('should soft-delete product and decrease deal backEndGross', () => {
      // Arrange: VSC with gross $700 on deal
      // Act: DELETE /api/deals/:dealId/fi-products/:productId
      // Assert: 200 (or 204)
      //         GET /api/deals/:dealId/fi-products does NOT include this product
      //         deal.backEndGross decreased by $700
    });

    it('should create audit log entry PRODUCT_REMOVED', () => {
      // Assert: ProductRemoved entry in audit log
    });

    it('should return 422 when deal is in Delivered status', () => {
      // Arrange: Delivered deal
      // Act: DELETE
      // Assert: 422
    });
  });

  describe('PATCH status (cancel product)', () => {
    it('should set product status to Cancelled and exclude from backEndGross', () => {
      // Arrange: Active VSC contributing $700 gross
      // Act: PATCH { status: "Cancelled" }
      // Assert: 200, product.status=Cancelled
      //         deal.backEndGross decreases by $700
    });

    it('should create audit log entry PRODUCT_STATUS_CHANGED for cancellation', () => {
      // Assert: ProductStatusChanged entry with afterSnapshot.status=Cancelled
    });

    it('should return 422 when attempting to set status to ChargedBack via this endpoint', () => {
      // ChargedBack is set only via the chargeback endpoint
      // Act: PATCH { status: "ChargedBack" }
      // Assert: 422
    });
  });
});
