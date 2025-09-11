import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';

import {
  validateGetAppointmentsPath,
  validateGetAppointmentsQuery,
  GetAppointmentsPathSchema,
  GetAppointmentsQuerySchema,
} from '@/modules/appointments/interfaces/http/schemas/GetAppointmentsSchema.js';

describe('GetAppointmentsSchema', () => {
  describe('GetAppointmentsPathSchema', () => {
    it('should validate valid insuredId', () => {
      // Arrange & Act
      const result = GetAppointmentsPathSchema.parse({ insuredId: '12345' });

      // Assert
      expect(result.insuredId).toBe('12345');
    });

    it('should validate insuredId with leading zeros', () => {
      // Arrange & Act
      const result = GetAppointmentsPathSchema.parse({ insuredId: '00123' });

      // Assert
      expect(result.insuredId).toBe('00123');
    });

    it('should reject insuredId that is too short', () => {
      // Arrange & Act & Assert
      expect(() => {
        GetAppointmentsPathSchema.parse({ insuredId: '1234' });
      }).toThrow(ZodError);
    });

    it('should reject insuredId that is too long', () => {
      // Arrange & Act & Assert
      expect(() => {
        GetAppointmentsPathSchema.parse({ insuredId: '123456' });
      }).toThrow(ZodError);
    });

    it('should reject insuredId with non-numeric characters', () => {
      // Arrange & Act & Assert
      expect(() => {
        GetAppointmentsPathSchema.parse({ insuredId: '1234a' });
      }).toThrow(ZodError);
    });

    it('should reject missing insuredId', () => {
      // Arrange & Act & Assert
      expect(() => {
        GetAppointmentsPathSchema.parse({});
      }).toThrow(ZodError);
    });
  });

  describe('GetAppointmentsQuerySchema', () => {
    it('should validate empty query parameters', () => {
      // Arrange & Act
      const result = GetAppointmentsQuerySchema.parse({});

      // Assert
      expect(result.status).toBeUndefined();
      expect(result.limit).toBeUndefined();
      expect(result.lastKey).toBeUndefined();
    });

    it('should validate valid status filter', () => {
      // Arrange & Act
      const result = GetAppointmentsQuerySchema.parse({ status: 'pending' });

      // Assert
      expect(result.status).toBe('pending');
    });

    it('should validate completed status filter', () => {
      // Arrange & Act
      const result = GetAppointmentsQuerySchema.parse({ status: 'completed' });

      // Assert
      expect(result.status).toBe('completed');
    });

    it('should reject invalid status', () => {
      // Arrange & Act & Assert
      expect(() => {
        GetAppointmentsQuerySchema.parse({ status: 'invalid' });
      }).toThrow(ZodError);
    });

    it('should validate and transform valid limit', () => {
      // Arrange & Act
      const result = GetAppointmentsQuerySchema.parse({ limit: '25' });

      // Assert
      expect(result.limit).toBe(25);
      expect(typeof result.limit).toBe('number');
    });

    it('should validate maximum limit', () => {
      // Arrange & Act
      const result = GetAppointmentsQuerySchema.parse({ limit: '100' });

      // Assert
      expect(result.limit).toBe(100);
    });

    it('should reject limit exceeding maximum', () => {
      // Arrange & Act & Assert
      expect(() => {
        GetAppointmentsQuerySchema.parse({ limit: '101' });
      }).toThrow(ZodError);
    });

    it('should reject zero limit', () => {
      // Arrange & Act & Assert
      expect(() => {
        GetAppointmentsQuerySchema.parse({ limit: '0' });
      }).toThrow(ZodError);
    });

    it('should reject negative limit', () => {
      // Arrange & Act & Assert
      expect(() => {
        GetAppointmentsQuerySchema.parse({ limit: '-1' });
      }).toThrow(ZodError);
    });

    it('should reject non-numeric limit', () => {
      // Arrange & Act & Assert
      expect(() => {
        GetAppointmentsQuerySchema.parse({ limit: 'abc' });
      }).toThrow(ZodError);
    });

    it('should validate lastKey', () => {
      // Arrange & Act
      const result = GetAppointmentsQuerySchema.parse({
        lastKey: 'some-key-123',
      });

      // Assert
      expect(result.lastKey).toBe('some-key-123');
    });

    it('should validate complex query with all parameters', () => {
      // Arrange & Act
      const result = GetAppointmentsQuerySchema.parse({
        status: 'pending',
        limit: '50',
        lastKey: 'pagination-key-456',
      });

      // Assert
      expect(result.status).toBe('pending');
      expect(result.limit).toBe(50);
      expect(result.lastKey).toBe('pagination-key-456');
    });
  });

  describe('Validation helper functions', () => {
    describe('validateGetAppointmentsPath', () => {
      it('should validate and return parsed path parameters', () => {
        // Arrange & Act
        const result = validateGetAppointmentsPath({ insuredId: '12345' });

        // Assert
        expect(result.insuredId).toBe('12345');
      });

      it('should throw ZodError for invalid path parameters', () => {
        // Arrange & Act & Assert
        expect(() => {
          validateGetAppointmentsPath({ insuredId: 'invalid' });
        }).toThrow(ZodError);
      });

      it('should handle null path parameters', () => {
        // Arrange & Act & Assert
        expect(() => {
          validateGetAppointmentsPath(null);
        }).toThrow(ZodError);
      });
    });

    describe('validateGetAppointmentsQuery', () => {
      it('should validate and return parsed query parameters', () => {
        // Arrange & Act
        const result = validateGetAppointmentsQuery({
          status: 'completed',
          limit: '25',
        });

        // Assert
        expect(result.status).toBe('completed');
        expect(result.limit).toBe(25);
      });

      it('should handle null query parameters as empty object', () => {
        // Arrange & Act
        const result = validateGetAppointmentsQuery(null);

        // Assert
        expect(result.status).toBeUndefined();
        expect(result.limit).toBeUndefined();
        expect(result.lastKey).toBeUndefined();
      });

      it('should handle undefined query parameters as empty object', () => {
        // Arrange & Act
        const result = validateGetAppointmentsQuery(undefined);

        // Assert
        expect(result.status).toBeUndefined();
        expect(result.limit).toBeUndefined();
        expect(result.lastKey).toBeUndefined();
      });

      it('should throw ZodError for invalid query parameters', () => {
        // Arrange & Act & Assert
        expect(() => {
          validateGetAppointmentsQuery({
            status: 'invalid-status',
            limit: '-5',
          });
        }).toThrow(ZodError);
      });
    });
  });

  describe('Error messages', () => {
    it('should provide meaningful error message for invalid insuredId', () => {
      // Arrange & Act & Assert
      try {
        GetAppointmentsPathSchema.parse({ insuredId: '123' });
        expect.fail('Should have thrown ZodError');
      } catch (error) {
        expect(error).toBeInstanceOf(ZodError);
        const zodError = error as ZodError;
        expect(zodError.issues[0].message).toContain(
          'must be exactly 5 digits'
        );
      }
    });

    it('should provide meaningful error message for invalid status', () => {
      // Arrange & Act & Assert
      try {
        GetAppointmentsQuerySchema.parse({ status: 'invalid' });
        expect.fail('Should have thrown ZodError');
      } catch (error) {
        expect(error).toBeInstanceOf(ZodError);
        const zodError = error as ZodError;
        expect(zodError.issues[0].message).toContain('Invalid option');
      }
    });

    it('should provide meaningful error message for invalid limit', () => {
      // Arrange & Act & Assert
      try {
        GetAppointmentsQuerySchema.parse({ limit: '101' });
        expect.fail('Should have thrown ZodError');
      } catch (error) {
        expect(error).toBeInstanceOf(ZodError);
        const zodError = error as ZodError;
        expect(zodError.issues[0].message).toContain(
          'must be between 1 and 100'
        );
      }
    });
  });
});
