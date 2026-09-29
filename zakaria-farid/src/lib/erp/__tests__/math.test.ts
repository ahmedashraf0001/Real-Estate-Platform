import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Decimal,
  D,
  formatEGP,
  minDecimal,
  maxDecimal,
  generateUUID,
  isUUID,
  ensureUUID,
} from '../math';

describe('ERP Fixed-Point Math Engine & Decimal Utility Suite', () => {

  describe('Decimal Construction & parseToCents Parsing Rules', () => {
    it('constructs from standard integer numbers, strings, and bigints', () => {
      assert.strictEqual(D(100).toFixed(2), '100.00');
      assert.strictEqual(D('100').toFixed(2), '100.00');
      assert.strictEqual(D(BigInt(100)).toFixed(2), '100.00');
      assert.strictEqual(new Decimal(50).toString(), '50.00');
    });

    it('constructs from decimal numbers and strings', () => {
      assert.strictEqual(D(125.75).toFixed(2), '125.75');
      assert.strictEqual(D('125.75').toFixed(2), '125.75');
      assert.strictEqual(D(0.05).toFixed(2), '0.05');
      assert.strictEqual(D('0.05').toFixed(2), '0.05');
    });

    it('pads single-digit decimal strings to 2 decimal places', () => {
      assert.strictEqual(D('10.5').toFixed(2), '10.50');
      assert.strictEqual(D('0.1').toFixed(2), '0.10');
      assert.strictEqual(D('-3.4').toFixed(2), '-3.40');
    });

    it('truncates decimal strings beyond 2 decimal places', () => {
      assert.strictEqual(D('10.555').toFixed(2), '10.55');
      assert.strictEqual(D('99.9999').toFixed(2), '99.99');
      assert.strictEqual(D('0.12345').toFixed(2), '0.12');
    });

    it('handles zero values and empty strings safely as 0.00', () => {
      assert.strictEqual(D(0).toFixed(2), '0.00');
      assert.strictEqual(D('0').toFixed(2), '0.00');
      assert.strictEqual(D('0.0').toFixed(2), '0.00');
      assert.strictEqual(D('0.00').toFixed(2), '0.00');
      assert.strictEqual(D('').toFixed(2), '0.00');
      assert.strictEqual(D('   ').toFixed(2), '0.00');
      assert.strictEqual(D(null as any).toFixed(2), '0.00');
      assert.strictEqual(D(undefined as any).toFixed(2), '0.00');
      assert.strictEqual(Decimal.zero().toFixed(2), '0.00');
    });

    it('parses negative numbers and negative formatted strings correctly', () => {
      assert.strictEqual(D(-50).toFixed(2), '-50.00');
      assert.strictEqual(D('-50').toFixed(2), '-50.00');
      assert.strictEqual(D('-50.25').toFixed(2), '-50.25');
      assert.strictEqual(D('-0.75').toFixed(2), '-0.75');
    });

    it('correctly strips commas from thousands-separated strings without zeroing out', () => {
      // Prior bug: BigInt threw SyntaxError on strings with commas, returning B_ZERO (0.00).
      assert.strictEqual(D('1,000').toFixed(2), '1000.00');
      assert.strictEqual(D('12,000,000').toFixed(2), '12000000.00');
      assert.strictEqual(D('1,234,567.89').toFixed(2), '1234567.89');
      assert.strictEqual(D('-1,500,000.50').toFixed(2), '-1500000.50');
      assert.strictEqual(D('  5,432,100.00  ').toFixed(2), '5432100.00');
    });

    it('falls back to 0.00 for non-numeric or corrupt strings', () => {
      assert.strictEqual(D('invalid_currency').toFixed(2), '0.00');
      assert.strictEqual(D('$$$').toFixed(2), '0.00');
      assert.strictEqual(D('abc123').toFixed(2), '0.00');
    });

    it('supports copy constructor and fromCents instantiation', () => {
      const original = D('450.25');
      const clone = new Decimal(original);
      assert.strictEqual(clone.toFixed(2), '450.25');
      assert.strictEqual(clone.equals(original), true);

      const fromC = Decimal.fromCents(BigInt(7520));
      assert.strictEqual(fromC.toFixed(2), '75.20');

      const negFromC = Decimal.fromCents(BigInt(-7520));
      assert.strictEqual(negFromC.toFixed(2), '-75.20');
    });
  });

  describe('Arithmetic Operations', () => {
    it('performs exact addition (plus)', () => {
      assert.strictEqual(D('100.50').plus(D('50.25')).toFixed(2), '150.75');
      assert.strictEqual(D('100.50').plus('50.25').toFixed(2), '150.75');
      assert.strictEqual(D('100.50').plus(50.25).toFixed(2), '150.75');
      assert.strictEqual(D('-50.00').plus('100.00').toFixed(2), '50.00');
      assert.strictEqual(D('10.00').plus('-25.00').toFixed(2), '-15.00');
    });

    it('performs exact subtraction (minus)', () => {
      assert.strictEqual(D('100.50').minus(D('50.25')).toFixed(2), '50.25');
      assert.strictEqual(D('100.50').minus('50.25').toFixed(2), '50.25');
      assert.strictEqual(D('100.50').minus(50.25).toFixed(2), '50.25');
      assert.strictEqual(D('50.00').minus('100.00').toFixed(2), '-50.00');
      assert.strictEqual(D('-50.00').minus('-20.00').toFixed(2), '-30.00');
    });

    it('performs exact multiplication with half-up rounding (times)', () => {
      assert.strictEqual(D('10.00').times('2.00').toFixed(2), '20.00');
      assert.strictEqual(D('10.00').times(0.5).toFixed(2), '5.00');
      assert.strictEqual(D('100.00').times('0.15').toFixed(2), '15.00');

      // Round half-up check: 10.55 * 1.50 = 15.825 -> 15.83
      assert.strictEqual(D('10.55').times('1.50').toFixed(2), '15.83');

      // Negative multiplication
      assert.strictEqual(D('-10.00').times('2.50').toFixed(2), '-25.00');
      assert.strictEqual(D('-10.00').times('-2.50').toFixed(2), '25.00');
    });

    it('performs integer division with half-up rounding (div / dividedBy)', () => {
      assert.strictEqual(D('10.00').div('2.00').toFixed(2), '5.00');
      assert.strictEqual(D('100.00').dividedBy(4).toFixed(2), '25.00');

      // Fractional division: 10.00 / 3 = 3.3333... -> 3.33
      assert.strictEqual(D('10.00').div(3).toFixed(2), '3.33');
      // 20.00 / 3 = 6.6666... -> 6.67
      assert.strictEqual(D('20.00').div(3).toFixed(2), '6.67');

      // Negative division
      assert.strictEqual(D('-10.00').div(2).toFixed(2), '-5.00');
      assert.strictEqual(D('10.00').div(-2).toFixed(2), '-5.00');
      assert.strictEqual(D('-10.00').div(-2).toFixed(2), '5.00');
    });

    it('throws on division by zero', () => {
      assert.throws(() => {
        D('100.00').div(0);
      }, /Division by zero/);

      assert.throws(() => {
        D('100.00').dividedBy('0.00');
      }, /Division by zero/);
    });
  });

  describe('Comparisons and Predicates', () => {
    it('compares equality (equals / eq)', () => {
      assert.strictEqual(D('100.50').equals(D('100.50')), true);
      assert.strictEqual(D('100.50').eq('100.50'), true);
      assert.strictEqual(D('100.50').eq(100.5), true);
      assert.strictEqual(D('100.50').eq('100.51'), false);
    });

    it('compares greater than (greaterThan / gt)', () => {
      assert.strictEqual(D('100.50').greaterThan('100.49'), true);
      assert.strictEqual(D('100.50').gt(100.50), false);
      assert.strictEqual(D('100.50').gt(100.51), false);
    });

    it('compares greater than or equal (greaterThanOrEqual / gte)', () => {
      assert.strictEqual(D('100.50').greaterThanOrEqual('100.50'), true);
      assert.strictEqual(D('100.50').gte('100.49'), true);
      assert.strictEqual(D('100.50').gte('100.51'), false);
    });

    it('compares less than (lessThan / lt)', () => {
      assert.strictEqual(D('50.00').lessThan('50.01'), true);
      assert.strictEqual(D('50.00').lt(50.00), false);
      assert.strictEqual(D('50.00').lt('49.99'), false);
    });

    it('compares less than or equal (lessThanOrEqual / lte)', () => {
      assert.strictEqual(D('50.00').lessThanOrEqual('50.00'), true);
      assert.strictEqual(D('50.00').lte('50.01'), true);
      assert.strictEqual(D('50.00').lte('49.99'), false);
    });

    it('inspects zero, positive, and negative states', () => {
      assert.strictEqual(D(0).isZero(), true);
      assert.strictEqual(D('0.00').isZero(), true);
      assert.strictEqual(D('0.01').isZero(), false);

      assert.strictEqual(D('10.00').isPositive(), true);
      assert.strictEqual(D('0.00').isPositive(), false);
      assert.strictEqual(D('-5.00').isPositive(), false);

      assert.strictEqual(D('-5.00').isNegative(), true);
      assert.strictEqual(D('0.00').isNegative(), false);
      assert.strictEqual(D('5.00').isNegative(), false);
    });

    it('computes absolute value (abs)', () => {
      assert.strictEqual(D('-42.50').abs().toFixed(2), '42.50');
      assert.strictEqual(D('42.50').abs().toFixed(2), '42.50');
      assert.strictEqual(D('0.00').abs().toFixed(2), '0.00');
    });

    it('computes min and max correctly', () => {
      assert.strictEqual(Decimal.min('10.00', '20.00').toFixed(2), '10.00');
      assert.strictEqual(Decimal.max('10.00', '20.00').toFixed(2), '20.00');

      assert.strictEqual(minDecimal(D('5.50'), D('3.25')).toFixed(2), '3.25');
      assert.strictEqual(maxDecimal(D('5.50'), D('3.25')).toFixed(2), '5.50');
    });
  });

  describe('Formatting & String / Number Conversions', () => {
    it('formats to fixed decimal digits with toFixed()', () => {
      const val = D('1234.56');
      assert.strictEqual(val.toFixed(0), '1234');
      assert.strictEqual(val.toFixed(1), '1234.5');
      assert.strictEqual(val.toFixed(2), '1234.56');
      assert.strictEqual(val.toFixed(4), '1234.5600');

      const neg = D('-78.90');
      assert.strictEqual(neg.toFixed(2), '-78.90');
      assert.strictEqual(neg.toFixed(0), '-78');
    });

    it('converts to JavaScript number via toNumber()', () => {
      assert.strictEqual(D('1234.56').toNumber(), 1234.56);
      assert.strictEqual(D('-50.25').toNumber(), -50.25);
      assert.strictEqual(D('0.00').toNumber(), 0);
    });

    it('formats Egyptian Pound currency strings in English and Arabic', () => {
      const val = D('12500000.50');
      assert.strictEqual(val.formatEGP(false), '12,500,000.50 EGP');
      assert.strictEqual(val.formatEGP(true), '12,500,000.50 ج.م');

      // Helper function formatEGP
      assert.strictEqual(formatEGP('12500000.50', false), '12,500,000.50 EGP');
      assert.strictEqual(formatEGP(1000, true), '1,000.00 ج.م');
      assert.strictEqual(formatEGP('-2500.75', false), '-2,500.75 EGP');
    });
  });

  describe('UUID Utilities', () => {
    it('generates compliant RFC 4122 v4 UUIDs', () => {
      const id1 = generateUUID();
      const id2 = generateUUID();
      assert.strictEqual(typeof id1, 'string');
      assert.strictEqual(id1.length, 36);
      assert.notStrictEqual(id1, id2);
      assert.strictEqual(isUUID(id1), true);
      assert.strictEqual(isUUID(id2), true);
    });

    it('validates UUIDs correctly with isUUID', () => {
      assert.strictEqual(isUUID('123e4567-e89b-12d3-a456-426614174000'), true);
      assert.strictEqual(isUUID('123e4567-e89b-42d3-8456-426614174000'), true);
      assert.strictEqual(isUUID(''), false);
      assert.strictEqual(isUUID(null), false);
      assert.strictEqual(isUUID(undefined), false);
      assert.strictEqual(isUUID('not-a-uuid'), false);
      assert.strictEqual(isUUID('123e4567-e89b-12d3-a456-42661417400Z'), false);
    });

    it('ensures valid UUID with ensureUUID', () => {
      const existing = '123e4567-e89b-12d3-a456-426614174000';
      assert.strictEqual(ensureUUID(existing), existing);

      const generatedForNull = ensureUUID(null);
      assert.strictEqual(isUUID(generatedForNull), true);

      const generatedForInvalid = ensureUUID('invalid-id');
      assert.strictEqual(isUUID(generatedForInvalid), true);
    });
  });
});
