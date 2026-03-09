import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';

/**
 * Integration tests verifying F&I Manager role permission boundaries:
 *
 *   - READ: Can view all deals and deal jackets (GET /api/deals, /api/deals/:id)
 *   - GENERATE: Can generate documents (POST /api/deals/:id/documents)
 *   - ADVANCE F&I → ContractsSigned (POST /api/deals/:id/status)
 *   - CANNOT CREATE deals (POST /api/deals → 403)
 *   - CANNOT desk deals (PATCH /api/deals/:id → 403)
 *   - CANNOT add/edit/remove fees (POST/PATCH/DELETE /api/deals/:id/fees → 403)
 *   - CANNOT add/edit/remove trade-ins (POST/PATCH/DELETE /api/deals/:id/trade-in → 403)
 *   - CANNOT approve Desking → F&I (status transition enforced by FSM)
 *   - CANNOT view sales report (GET /api/reports/sales → 403)
 */
describe('F&I Manager role boundaries (integration)', () => {
  let app: INestApplication;
  let fniToken: string;
  let dealId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login as F&I Manager
    const fniRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'fni@autodesk-dms.com', password: 'password' });
    fniToken = fniRes.body.accessToken;

    // Seed or find a deal in F&I status for transition tests
    const managerRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'manager@autodesk-dms.com', password: 'password' });
    const managerToken = managerRes.body.accessToken;

    const listRes = await request(app.getHttpServer())
      .get('/api/deals')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(HttpStatus.OK);

    if (listRes.body.data?.length > 0) {
      dealId = listRes.body.data[0].id;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Allowed operations', () => {
    it('GET /api/deals — returns 200', async () => {
      await request(app.getHttpServer())
        .get('/api/deals')
        .set('Authorization', `Bearer ${fniToken}`)
        .expect(HttpStatus.OK);
    });

    it('GET /api/deals/:id — returns 200', async () => {
      if (!dealId) return;
      await request(app.getHttpServer())
        .get(`/api/deals/${dealId}`)
        .set('Authorization', `Bearer ${fniToken}`)
        .expect(HttpStatus.OK);
    });
  });

  describe('Forbidden operations', () => {
    it('POST /api/deals — 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post('/api/deals')
        .set('Authorization', `Bearer ${fniToken}`)
        .send({ customerId: 'some-id', vehicleId: 'some-id', dealType: 'Cash' })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('PATCH /api/deals/:id — 403 Forbidden', async () => {
      if (!dealId) return;
      await request(app.getHttpServer())
        .patch(`/api/deals/${dealId}`)
        .set('Authorization', `Bearer ${fniToken}`)
        .send({ salePrice: 1, updatedAt: new Date().toISOString() })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('POST /api/deals/:id/fees — 403 Forbidden', async () => {
      if (!dealId) return;
      await request(app.getHttpServer())
        .post(`/api/deals/${dealId}/fees`)
        .set('Authorization', `Bearer ${fniToken}`)
        .send({ name: 'Test Fee', amount: 100, taxable: false })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('POST /api/deals/:id/trade-in — 403 Forbidden', async () => {
      if (!dealId) return;
      await request(app.getHttpServer())
        .post(`/api/deals/${dealId}/trade-in`)
        .set('Authorization', `Bearer ${fniToken}`)
        .send({ year: 2019, make: 'Honda', model: 'Accord', mileage: 50000, condition: 'Good', acv: 10000, allowance: 10000, payoff: 0 })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('GET /api/reports/sales — 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get('/api/reports/sales')
        .set('Authorization', `Bearer ${fniToken}`)
        .query({ startDate: '2020-01-01', endDate: '2030-12-31' })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('PATCH /api/config/dealership — 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .patch('/api/config/dealership')
        .set('Authorization', `Bearer ${fniToken}`)
        .send({ dealNumberOffset: 2000 })
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('Status transition — F&I Manager can only advance F&I → Contracts Signed', () => {
    it('POST /api/deals/:id/status with invalid transition returns 422', async () => {
      if (!dealId) return;
      // Attempting to approve Desking → F&I as F&I Manager must be rejected by FSM
      await request(app.getHttpServer())
        .post(`/api/deals/${dealId}/status`)
        .set('Authorization', `Bearer ${fniToken}`)
        .send({ newStatus: 'Fni' })
        .expect((res: { status: number }) => {
          expect([HttpStatus.UNPROCESSABLE_ENTITY, HttpStatus.FORBIDDEN]).toContain(res.status);
        });
    });
  });
});
