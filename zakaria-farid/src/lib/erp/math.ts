/**
 * Zakaria Farid Real Estate ERP — Fixed-Point Currency Math Engine
 * Enforces Spec Section 0.5: No currency math in floating point, ever.
 * All calculations are performed on exact integer-scaled values (piastres/cents).
 */

const B_ZERO = BigInt(0);
const B_ONE = BigInt(1);
const B_TWO = BigInt(2);
const B_HUNDRED = BigInt(100);
const B_TEN = BigInt(10);

/**
 * Exact decimal parse of a number or numeric string into n / scale (scale = 10^k), keeping every digit.
 * Accepts grouping commas, a sign and an exponent ("1.5e2"). Returns null for anything non-numeric.
 */
function toScaled(value: number | string): { n: bigint; scale: bigint } | null {
  let text: string;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    text = String(value);
  } else {
    text = value.trim().replace(/,/g, '');
  }
  const m = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(text);
  if (!m || (!m[2] && !m[3])) return null;
  const negative = m[1] === '-';
  const whole = m[2] || '0';
  const frac = m[3] || '';
  const exp = m[4] ? parseInt(m[4], 10) : 0;

  let n = BigInt(whole + frac);
  let fracDigits = frac.length - exp;
  if (fracDigits < 0) {
    n *= B_TEN ** BigInt(-fracDigits);
    fracDigits = 0;
  }
  return { n: negative ? -n : n, scale: B_TEN ** BigInt(fracDigits) };
}

/** num / den rounded half away from zero (half-up on magnitude). */
function roundHalfUpDiv(num: bigint, den: bigint): bigint {
  if (den === B_ZERO) {
    throw new Error('ERP Math Error: Division by zero');
  }
  const negative = (num < B_ZERO) !== (den < B_ZERO);
  const absNum = num < B_ZERO ? -num : num;
  const absDen = den < B_ZERO ? -den : den;
  const q = (absNum * B_TWO + absDen) / (absDen * B_TWO);
  return negative ? -q : q;
}

/** n / scale form of any operand: Decimal uses its cents over 100. */
function operand(value: number | string | Decimal): { n: bigint; scale: bigint } {
  if (value instanceof Decimal) {
    return { n: value.toCents(), scale: B_HUNDRED };
  }
  return toScaled(value) ?? { n: B_ZERO, scale: B_ONE };
}

export class Decimal {
  private readonly cents: bigint;

  constructor(value: number | string | bigint | Decimal) {
    if (value instanceof Decimal) {
      this.cents = value.cents;
    } else if (typeof value === 'bigint') {
      this.cents = value * B_HUNDRED;
    } else if (typeof value === 'number' || typeof value === 'string') {
      // Exact decimal text, rounded half-up to piastres; non-numeric input stays 0.
      const scaled = toScaled(value);
      this.cents = scaled ? roundHalfUpDiv(scaled.n * B_HUNDRED, scaled.scale) : B_ZERO;
    } else {
      this.cents = B_ZERO;
    }
  }

  /** Raw integer piastres. */
  toCents(): bigint {
    return this.cents;
  }

  static fromCents(cents: bigint): Decimal {
    const d = new Decimal('0');
    (d as unknown as { cents: bigint }).cents = cents;
    return d;
  }

  static zero(): Decimal {
    return new Decimal('0.00');
  }

  static max(a: Decimal | string | number, b: Decimal | string | number): Decimal {
    const da = a instanceof Decimal ? a : new Decimal(a);
    const db = b instanceof Decimal ? b : new Decimal(b);
    return da.gte(db) ? da : db;
  }

  static min(a: Decimal | string | number, b: Decimal | string | number): Decimal {
    const da = a instanceof Decimal ? a : new Decimal(a);
    const db = b instanceof Decimal ? b : new Decimal(b);
    return da.lte(db) ? da : db;
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
   * Exact multiplication; the factor keeps all its digits and the result is rounded half-up once.
   */
  times(factor: number | string | Decimal): Decimal {
    const f = operand(factor);
    return Decimal.fromCents(roundHalfUpDiv(this.cents * f.n, f.scale));
  }

  /**
   * Exact division; the divisor keeps all its digits and the result is rounded half-up once.
   */
  div(divisor: number | string | Decimal): Decimal {
    const d = operand(divisor);
    return Decimal.fromCents(roundHalfUpDiv(this.cents * d.scale, d.n));
  }

  /**
   * Apply a percentage or share without pre-rounding the ratio, e.g. amount.timesRatio(33.33, 100).
   */
  timesRatio(numerator: number | string | Decimal, denominator: number | string | Decimal): Decimal {
    const a = operand(numerator);
    const b = operand(denominator);
    return Decimal.fromCents(roundHalfUpDiv(this.cents * a.n * b.scale, a.scale * b.n));
  }

  dividedBy(divisor: number | string | Decimal): Decimal {
    return this.div(divisor);
  }

  equals(other: Decimal | string | number): boolean {
    const o = other instanceof Decimal ? other : new Decimal(other);
    return this.cents === o.cents;
  }

  eq(other: Decimal | string | number): boolean {
    return this.equals(other);
  }

  greaterThan(other: Decimal | string | number): boolean {
    const o = other instanceof Decimal ? other : new Decimal(other);
    return this.cents > o.cents;
  }

  gt(other: Decimal | string | number): boolean {
    return this.greaterThan(other);
  }

  greaterThanOrEqual(other: Decimal | string | number): boolean {
    const o = other instanceof Decimal ? other : new Decimal(other);
    return this.cents >= o.cents;
  }

  gte(other: Decimal | string | number): boolean {
    return this.greaterThanOrEqual(other);
  }

  lessThan(other: Decimal | string | number): boolean {
    const o = other instanceof Decimal ? other : new Decimal(other);
    return this.cents < o.cents;
  }

  lt(other: Decimal | string | number): boolean {
    return this.lessThan(other);
  }

  lessThanOrEqual(other: Decimal | string | number): boolean {
    const o = other instanceof Decimal ? other : new Decimal(other);
    return this.cents <= o.cents;
  }

  lte(other: Decimal | string | number): boolean {
    return this.lessThanOrEqual(other);
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

  min(other: Decimal | string | number): Decimal {
    return Decimal.min(this, other);
  }

  max(other: Decimal | string | number): Decimal {
    return Decimal.max(this, other);
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

/**
 * Exact numerator / denominator as a plain decimal string with `digits` decimals (half-up).
 * Use it for ratios and factors (RSV factor, share, rate) — a Decimal can only hold 2 decimals.
 */
export function ratio(
  numerator: number | string | Decimal,
  denominator: number | string | Decimal,
  digits = 6
): string {
  const a = operand(numerator);
  const b = operand(denominator);
  const unit = B_TEN ** BigInt(digits);
  const q = roundHalfUpDiv(a.n * b.scale * unit, a.scale * b.n);
  const negative = q < B_ZERO;
  const abs = (negative ? -q : q).toString().padStart(digits + 1, '0');
  const text = digits > 0 ? `${abs.slice(0, abs.length - digits)}.${abs.slice(-digits)}` : abs;
  return negative ? `-${text}` : text;
}

export function D(val: number | string | Decimal | bigint): Decimal {
  return new Decimal(val);
}

export function formatEGP(val: number | string | Decimal | bigint, isAr = false): string {
  return D(val).formatEGP(isAr);
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
