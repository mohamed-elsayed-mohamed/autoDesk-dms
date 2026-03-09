import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';

/**
 * Integration tests verifying that Deal and GeneratedDocument records
 * can never be deleted via any exposed endpoint (7-year retention requirement).
 *
 * These tests require a running PostgreSQL instance (see .env.test).
 */
describe('No-delete constraints (integration)', () => {
  let app: INestApplication;
  let consultantToken: string;
  let managerToken: string;
  let dealId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login as Sales Consultant
    const consultantRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'sales@autodesk-dms.com', password: 'password' });
    consultantToken = consultantRes.body.accessToken;

    // Login as Sales Manager
    const managerRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'manager@autodesk-dms.com', password: 'password' });
    managerToken = managerRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Deal records cannot be deleted', () => {
    beforeAll(async () => {
      // Get any existing deal ID
      const listRes = await request(app.getHttpServer())
        .get('/api/deals')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(HttpStatus.OK);

      if (listRes.body.data?.length > 0) {
        dealId = listRes.body.data[0].id;
      }
    });

    it('DELETE /api/deals/:id returns 404 (route not found)', async () => {
      if (!dealId) return; // no deals seeded
      await request(app.getHttpServer())
        .delete(`/api/deals/${dealId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('DELETE /api/deals/:id with general manager token also returns 404', async () => {
      if (!dealId) return;
      // General managers cannot delete either
      const gmRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'gm@autodesk-dms.com', password: 'password' });

      await request(app.getHttpServer())
        .delete(`/api/deals/${dealId}`)
        .set('Authorization', `Bearer ${gmRes.body.accessToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('GeneratedDocument records cannot be deleted', () => {
    it('DELETE /api/deals/:id/documents/:docId returns 404 (route not found)', async () => {
      if (!dealId) return;
      const fakeDocId = '00000000-0000-0000-0000-000000000001';

      await request(app.getHttpServer())
        .delete(`/api/deals/${dealId}/documents/${fakeDocId}`)
        .set('Authorization', `Bearer ${consultantToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('DealStatusHistory records cannot be deleted or updated', () => {
    it('DELETE /api/deals/:id/status/:historyId returns 404 (route not found)', async () => {
      if (!dealId) return;
      const fakeHistoryId = '00000000-0000-0000-0000-000000000002';

      await request(app.getHttpServer())
        .delete(`/api/deals/${dealId}/status/${fakeHistoryId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('PATCH /api/deals/:id/status/:historyId returns 404 (route not found)', async () => {
      if (!dealId) return;
      const fakeHistoryId = '00000000-0000-0000-0000-000000000002';

      await request(app.getHttpServer())
        .patch(`/api/deals/${dealId}/status/${fakeHistoryId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ note: 'tampered' })
        .expect(HttpStatus.NOT_FOUND);
    });
  });
});
