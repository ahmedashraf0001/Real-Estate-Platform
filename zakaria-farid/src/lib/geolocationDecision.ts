/** Unknown accuracy (including IP lookup) never authorizes a pin move. */
export function locationDecision(accuracy: number | undefined, isAr = false) {
  const known = typeof accuracy === 'number' && Number.isFinite(accuracy) && accuracy >= 0;
  const move = known && accuracy <= 1500;
  const radius = known ? (move ? Math.ceil(accuracy) : Math.ceil(accuracy / 1000)) : null;
  return {
    move,
    message: move
      ? isAr ? `تم تحديد موقعك (±${radius} م)` : `Location found (±${radius} m)`
      : isAr
        ? `موقعك من المتصفح تقريبي (${radius === null ? 'دقة غير معروفة' : `±${radius} كم`}) — ابحث باسم المكان أو اسحب الدبوس`
        : `Your browser location is approximate (${radius === null ? 'unknown accuracy' : `±${radius} km`}) — search by place name or drag the pin`,
  };
}

export function locationError(code: number, isAr = false): string {
  const reason = code === 1 ? (isAr ? 'تم رفض إذن الموقع' : 'Location permission denied')
    : code === 3 ? (isAr ? 'انتهت مهلة تحديد الموقع' : 'Location timeout')
    : (isAr ? 'الموقع غير متاح' : 'Location unavailable');
  return `${reason} — ${isAr ? 'ابحث باسم المكان أو اسحب الدبوس' : 'search by place name or drag the pin'}`;
}
