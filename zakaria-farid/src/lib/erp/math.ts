/**
 * Zakaria Farid Real Estate ERP — Fixed-Point Currency Math Engine
 * Enforces Spec Section 0.5: No currency math in floating point, ever.
 * All calculations are performed on exact integer-scaled values (piastres/cents).
 */

const B_ZERO = BigInt(0);
const B_ONE = BigInt(1);
const B_TWO = BigInt(2);
const B_FIFTY = BigInt(50);
const B_HUNDRED = BigInt(100);

export class Decimal {
  private readonly cents: bigint;

  constructor(value: number | string | bigint | Decimal) {
    if (value instanceof Decimal) {
      this.cents = value.cents;
    } else if (typeof value === 'bigint') {
      this.cents = value * B_HUNDRED;
    } else if (typeof value === 'number') {
      // Clean string conversion to avoid IEEE 754 precision issues
      this.cents = Decimal.parseToCents(value.toFixed(2));
    } else if (typeof value === 'string') {
      this.cents = Decimal.parseToCents(value);
    } else {
      this.cents = B_ZERO;
    }
  }

  private static parseToCents(valStr: string): bigint {
    const trimmed = valStr.trim();
    if (!trimmed || trimmed === '0' || trimmed === '0.0' || trimmed === '0.00') {
      return B_ZERO;
    }

    const isNegative = trimmed.startsWith('-');
    const clean = isNegative ? trimmed.slice(1) : trimmed;
    const parts = clean.split('.');

    const wholeStr = parts[0] || '0';
    let fracStr = parts[1] || '00';

    if (fracStr.length === 1) {
      fracStr = fracStr + '0';
    } else if (fracStr.length > 2) {
      // Truncate/round to 2 decimals
      fracStr = fracStr.slice(0, 2);
    }

    const wholeBig = BigInt(wholeStr);
    const fracBig = BigInt(fracStr);
    const totalCents = wholeBig * B_HUNDRED + fracBig;

    return isNegative ? -totalCents : totalCents;
  }

  static fromCents(cents: bigint): Decimal {
    const d = new Decimal('0');
    (d as unknown as { cents: bigint }).cents = cents;
    return d;
  }

  static zero(): Decimal {
    return new Decimal('0.00');
  }

  plus(other: Decimal | string | number): Decimal {
    const o = other instanceof Decimal ? other : new Decimal(other);
    return Decimal.fromCents(this.cents + o.cents);
  }

  minus(other: Decimal | string | number): Decimal {
    const o = other instanceof Decimal ? other : new Decimal(other);
    return Decimal.fromCents(this.cents - o.cents);
  }

  /**
   * Exact integer multiplication followed by integer division by 100 (standard round-half-up).
   */
  times(factor: number | string | Decimal): Decimal {
    const f = factor instanceof Decimal ? factor : new Decimal(factor);
    const raw = this.cents * f.cents;
    const sign = raw < B_ZERO ? -B_ONE : B_ONE;
    const absRaw = raw < B_ZERO ? -raw : raw;
    const rounded = (absRaw + B_FIFTY) / B_HUNDRED; // back to single cents scale
    return Decimal.fromCents(sign * rounded);
  }

  /**
   * Divide by an integer count or factor, with standard integer math.
   */
  div(divisor: number | string | Decimal): Decimal {
    const d = divisor instanceof Decimal ? divisor : new Decimal(divisor);
    if (d.cents === B_ZERO) {
      throw new Error('ERP Math Error: Division by zero');
    }
    const scaled = this.cents * B_HUNDRED;
    const sign = (scaled < B_ZERO && d.cents > B_ZERO) || (scaled > B_ZERO && d.cents < B_ZERO) ? -B_ONE : B_ONE;
    const absScaled = scaled < B_ZERO ? -scaled : scaled;
    const absD = d.cents < B_ZERO ? -d.cents : d.cents;
    const rounded = (absScaled + (absD / B_TWO)) / absD;
    return Decimal.fromCents(sign * rounded);
  }

  equals(other: Decimal | string | number): boolean {
    const o = other instanceof Decimal ? other : new Decimal(other);
    return this.cents === o.cents;
  }

  greaterThan(other: Decimal | string | number): boolean {
    const o = other instanceof Decimal ? other : new Decimal(other);
    return this.cents > o.cents;
  }

  greaterThanOrEqual(other: Decimal | string | number): boolean {
    const o = other instanceof Decimal ? other : new Decimal(other);
    return this.cents >= o.cents;
  }

  lessThan(other: Decimal | string | number): boolean {
    const o = other instanceof Decimal ? other : new Decimal(other);
    return this.cents < o.cents;
  }

  lessThanOrEqual(other: Decimal | string | number): boolean {
    const o = other instanceof Decimal ? other : new Decimal(other);
    return this.cents <= o.cents;
  }

  isZero(): boolean {
    return this.cents === B_ZERO;
  }

  isNegative(): boolean {
    return this.cents < B_ZERO;
  }

  isPositive(): boolean {
    return this.cents > B_ZERO;
  }

  abs(): Decimal {
    return this.cents < B_ZERO ? Decimal.fromCents(-this.cents) : this;
  }

  toFixed(fractionDigits = 2): string {
    const isNeg = this.cents < B_ZERO;
    const absCents = isNeg ? -this.cents : this.cents;
    const whole = absCents / B_HUNDRED;
    const rem = absCents % B_HUNDRED;
    let remStr = rem < BigInt(10) ? '0' + rem.toString() : rem.toString();
    if (fractionDigits > 2) {
      remStr = remStr.padEnd(fractionDigits, '0');
    } else if (fractionDigits < 2) {
      remStr = remStr.slice(0, fractionDigits);
    }
    const formatted = fractionDigits > 0 ? `${whole.toString()}.${remStr}` : whole.toString();
    return isNeg ? `-${formatted}` : formatted;
  }

  toString(): string {
    return this.toFixed(2);
  }

  toNumber(): number {
    return parseFloat(this.toFixed(2));
  }

  formatEGP(isAr = false): string {
    const parts = this.toFixed(2).split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return isAr ? `${integerPart}.${parts[1]} ج.م` : `${integerPart}.${parts[1]} EGP`;
  }
}

export function D(val: number | string | Decimal | bigint): Decimal {
  return new Decimal(val);
}

/**
 * Helper to compute minimum of two Decimals.
 */
export function minDecimal(a: Decimal, b: Decimal): Decimal {
  return a.lessThan(b) ? a : b;
}

/**
 * Helper to compute maximum of two Decimals.
 */
export function maxDecimal(a: Decimal, b: Decimal): Decimal {
  return a.greaterThan(b) ? a : b;
}

/**
 * RFC 4122 v4 compliant UUID generator.
 * Operates reliably in Node.js, modern browser runtimes, and SSR environments.
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Validates whether a string matches standard 36-character UUID format.
 */
export function isUUID(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str.trim());
}

/**
 * Ensures an ID string is a valid UUID, returning a fresh UUID if input is missing or non-UUID.
 */
export function ensureUUID(id?: string | null): string {
  if (id && isUUID(id)) return id.trim();
  return generateUUID();
}
