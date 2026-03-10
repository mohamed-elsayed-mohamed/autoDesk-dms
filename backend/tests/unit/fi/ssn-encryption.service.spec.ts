import { SsnEncryptionService } from '../../../src/modules/fi/calculation/ssn-encryption.service';

describe('SsnEncryptionService', () => {
  let service: SsnEncryptionService;

  beforeEach(() => {
    // Set a test key (64 hex chars = 32 bytes)
    process.env.SSN_ENCRYPTION_KEY = 'a'.repeat(64);
    service = new SsnEncryptionService();
  });

  afterEach(() => {
    delete process.env.SSN_ENCRYPTION_KEY;
  });

  describe('encrypt', () => {
    it('produces different ciphertext each call (random IV)', () => {
      const result1 = service.encrypt('123456789');
      const result2 = service.encrypt('123456789');
      expect(result1.ciphertext).not.toBe(result2.ciphertext);
      expect(result1.iv).not.toBe(result2.iv);
    });

    it('returns lastFour as the last 4 digits of SSN', () => {
      const result = service.encrypt('123456789');
      expect(result.lastFour).toBe('6789');
    });

    it('returns base64-encoded ciphertext and iv', () => {
      const result = service.encrypt('123-45-6789');
      expect(result.ciphertext).toMatch(/^[A-Za-z0-9+/]+=*$/);
      expect(result.iv).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });
  });

  describe('decrypt', () => {
    it('decrypt(encrypt(ssn)) round-trip returns original SSN', () => {
      const ssn = '123-45-6789';
      const { ciphertext, iv } = service.encrypt(ssn);
      expect(service.decrypt(ciphertext, iv)).toBe(ssn);
    });

    it('throws on invalid IV (tampered ciphertext)', () => {
      const { ciphertext } = service.encrypt('123456789');
      expect(() => service.decrypt(ciphertext, 'invalidIV=')).toThrow();
    });
  });

  describe('mask', () => {
    it('returns XXX-XX-#### format using ssnLastFour', () => {
      expect(service.mask('1234')).toBe('XXX-XX-1234');
    });

    it('uses ssnLastFour not the full SSN', () => {
      const result = service.encrypt('987654321');
      const masked = service.mask(result.lastFour);
      expect(masked).toBe('XXX-XX-4321');
      expect(masked).not.toContain('987654321');
    });
  });

  describe('constructor', () => {
    it('throws if SSN_ENCRYPTION_KEY is not set', () => {
      delete process.env.SSN_ENCRYPTION_KEY;
      expect(() => new SsnEncryptionService()).toThrow();
    });

    it('throws if SSN_ENCRYPTION_KEY is not 64 hex chars (32 bytes)', () => {
      process.env.SSN_ENCRYPTION_KEY = 'tooshort';
      expect(() => new SsnEncryptionService()).toThrow();
    });
  });
});
