/**
 * Tafqeet: Arabic Number to Words Converter for Egyptian Pounds (EGP)
 * Converts numeric amounts into formal legal Arabic financial text.
 * Example: 250000 -> "فقط مائتان وخمسون ألف جنيه مصري لا غير"
 */

const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
const onesFeminine = ['', 'واحدة', 'اثنتان', 'ثلاث', 'أربع', 'خمس', 'ست', 'سبع', 'ثمان', 'تسع'];
const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

function convertGroup(n: number): string {
  let result = '';
  const h = Math.floor(n / 100);
  const remainder = n % 100;
  const t = Math.floor(remainder / 10);
  const o = remainder % 10;

  if (h > 0) {
    result += hundreds[h];
  }

  if (remainder > 0) {
    if (result.length > 0) result += ' و';

    if (remainder < 10) {
      result += ones[remainder];
    } else if (remainder < 20) {
      result += teens[remainder - 10];
    } else {
      if (o > 0) {
        result += ones[o] + ' و';
      }
      result += tens[t];
    }
  }

  return result;
}

export function tafqeetEGP(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount.replace(/,/g, '')) : amount;
  if (isNaN(num) || num <= 0) return 'صفر جنيه مصري';

  const integerPart = Math.floor(num);
  const fractionPart = Math.round((num - integerPart) * 100);

  let parts: string[] = [];

  // Billions (مليار)
  const billions = Math.floor(integerPart / 1000000000);
  const afterBillions = integerPart % 1000000000;

  if (billions > 0) {
    if (billions === 1) parts.push('مليار');
    else if (billions === 2) parts.push('ملياران');
    else if (billions >= 3 && billions <= 10) parts.push(`${convertGroup(billions)} مليارات`);
    else parts.push(`${convertGroup(billions)} مليار`);
  }

  // Millions (مليون)
  const millions = Math.floor(afterBillions / 1000000);
  const afterMillions = afterBillions % 1000000;

  if (millions > 0) {
    if (millions === 1) parts.push('مليون');
    else if (millions === 2) parts.push('مليونان');
    else if (millions >= 3 && millions <= 10) parts.push(`${convertGroup(millions)} ملايين`);
    else parts.push(`${convertGroup(millions)} مليون`);
  }

  // Thousands (ألف)
  const thousands = Math.floor(afterMillions / 1000);
  const units = afterMillions % 1000;

  if (thousands > 0) {
    if (thousands === 1) parts.push('ألف');
    else if (thousands === 2) parts.push('ألفان');
    else if (thousands >= 3 && thousands <= 10) parts.push(`${convertGroup(thousands)} آلاف`);
    else parts.push(`${convertGroup(thousands)} ألف`);
  }

  // Units (1 to 999)
  if (units > 0) {
    parts.push(convertGroup(units));
  }

  let fullWords = parts.join(' و');

  // Add Currency suffix
  if (integerPart === 1) {
    fullWords = 'جنيه مصري واحد';
  } else if (integerPart === 2) {
    fullWords = 'جنيهان مصريان';
  } else if (integerPart >= 3 && integerPart <= 10) {
    fullWords += ' جنيهات مصرية';
  } else {
    fullWords += ' جنيه مصري';
  }

  // Fraction (قرش)
  if (fractionPart > 0) {
    fullWords += ` و${convertGroup(fractionPart)} قرشاً`;
  }

  return `فقط ${fullWords} لا غير`;
}
