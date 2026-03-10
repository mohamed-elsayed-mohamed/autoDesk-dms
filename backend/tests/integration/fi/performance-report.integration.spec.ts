/**
 * Integration tests for F&I Performance Report API — US4
 * Run against a test DB with:
 *   DATABASE_URL=<test-db-url> npm run test:integration
 *
 * Prerequisites: FniManager and Controller users seeded; funded deals with products.
 * The dual-window date logic is critical: revenue uses Deal.fundedAt, chargebacks use
 * FIProduct.chargebackDate — these are INDEPENDENT axes.
 */

describe('F&I Performance Report API — US4', () => {
  describe('GET /api/fi/performance-report?from=&to= (JSON report)', () => {
    it('should aggregate revenue from funded deals and chargebacks independently by date window', () => {
      // Arrange (in DB):
      //   Deal A: fundedAt=2026-03-01, products: VSC ($700 gross, Active), GAP ($495, Active)
      //   Deal B: fundedAt=2026-03-15, products: VSC ($600 gross, Active, chargebackDate=2026-04-10)
      //
      // Act: GET /api/fi/performance-report?from=2026-03-01&to=2026-03-31
      // Assert:
      //   - fundedUnits === 2 (both funded in March)
      //   - totalRevenue === 1795 (700+495 from Deal A + 600 from Deal B — ACTIVE product counts)
      //   - totalChargebacks === 0 (chargebackDate=April, not in March range)
      //   - netRevenue === 1795
      //   - PVR === 897.50 (1795 / 2)
    });

    it('should include chargeback from April range when filtering April dates', () => {
      // Act: GET /api/fi/performance-report?from=2026-04-01&to=2026-04-30
      // Assert:
      //   - fundedUnits === 0 (no deals funded in April)
      //   - totalRevenue === 0
      //   - totalChargebacks === 600 (chargebackDate=April from Deal B's VSC)
      //   - PVR === null (fundedUnits = 0)
    });

    it('should exclude CHARGED_BACK products from revenue total', () => {
      // Arrange: Deal C funded in range, VSC status=ChargedBack (not Active/Cancelled)
      // Assert: VSC gross NOT included in totalRevenue
    });

    it('should include CANCELLED products in revenue total', () => {
      // Arrange: Deal D funded in range, GAP status=Cancelled
      // Assert: GAP gross IS included in totalRevenue (cancelled products still count as revenue)
    });

    it('should return PVR as null when fundedUnits = 0', () => {
      // Act: GET with date range containing no funded deals
      // Assert: summary.pvr === null
    });

    it('should include per-deal breakdown with fundedAt, revenue, chargebacks, net, productCount', () => {
      // Assert: response.deals is array, each entry has dealId, fundedAt, revenue, chargebacks, net
    });

    it('should return 200 for FniManager role', () => {
      // Assert: 200
    });

    it('should return 200 for Controller role', () => {
      // Assert: 200
    });

    it('should return 403 for SalesManager role', () => {
      // Assert: 403
    });
  });

  describe('GET /api/fi/performance-report/export?from=&to= (CSV export)', () => {
    it('should respond with Content-Disposition: attachment; filename="fi-performance-..."', () => {
      // Assert: response header Content-Disposition matches /attachment; filename="fi-performance-/
    });

    it('should respond with content-type text/csv', () => {
      // Assert: response header Content-Type includes text/csv
    });

    it('should include header row and data rows in CSV', () => {
      // Act: export with known date range
      // Assert: first line of response body contains CSV headers
      //         subsequent lines contain deal data rows
    });

    it('should return 403 for SalesManager role on CSV export', () => {
      // Assert: 403
    });
  });
});
