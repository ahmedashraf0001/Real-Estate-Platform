/**
 * Zakaria Farid Real Estate ERP — High-Resolution Excel Chart Renderer
 * Generates crisp 2x Retina PNG chart visualizations using client-side HTML5 Canvas.
 * Embedded directly into ExcelJS workbooks for executive financial presentations.
 */

export interface DonutChartSlice {
  label: string;
  value: number;
  color: string;
  subtext?: string;
}

export interface BarChartItem {
  label: string;
  value: number;
  color: string;
  formattedValue?: string;
  percentage?: number;
}

/**
 * Format currency numbers for chart labels
 */
function formatChartMoney(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(2)} مليون ج.م`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)} ألف ج.م`;
  }
  return `${num.toLocaleString('ar-EG')} ج.م`;
}

/**
 * Renders an executive Donut Chart with legend and center summary to a Base64 PNG.
 */
export function renderDonutChart(
  slices: DonutChartSlice[],
  options: {
    title: string;
    centerTitle?: string;
    centerSubtitle?: string;
    width?: number;
    height?: number;
  }
): string {
  if (typeof document === 'undefined') {
    return '';
  }

  const width = options.width || 700;
  const height = options.height || 360;
  const scale = 2; // Retina sharpness

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.scale(scale, scale);

  // Background Card
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Subtle Card Border
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

  // Title Header
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(options.title, width - 24, 32);

  // Decorative Accent Bar under title
  ctx.fillStyle = '#b8903e'; // Luxury Gold
  ctx.fillRect(width - 70, 42, 46, 3);

  const total = slices.reduce((acc, s) => acc + (s.value > 0 ? s.value : 0), 0);
  if (total === 0) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('لا توجد بيانات مالية للعرض', width / 2, height / 2);
    return canvas.toDataURL('image/png');
  }

  // Geometry for Donut (Left half)
  const centerX = 160;
  const centerY = height / 2 + 15;
  const outerRadius = 110;
  const innerRadius = 72;

  let currentAngle = -Math.PI / 2;

  slices.forEach(slice => {
    if (slice.value <= 0) return;
    const sliceAngle = (slice.value / total) * 2 * Math.PI;

    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, currentAngle, currentAngle + sliceAngle, false);
    ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
    ctx.closePath();

    ctx.fillStyle = slice.color;
    ctx.fill();

    // Slice Separator
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();

    currentAngle += sliceAngle;
  });

  // Center Donut Summary Text
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#64748b';
  ctx.font = '11px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText(options.centerSubtitle || 'إجمالي المركز', centerX, centerY - 12);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText(options.centerTitle || formatChartMoney(total), centerX, centerY + 10);

  // Right Half: Legend items
  const legendX = width - 24;
  let legendY = 70;
  const rowHeight = 44;

  slices.forEach(slice => {
    const pct = total > 0 ? ((slice.value / total) * 100).toFixed(1) : '0';

    // Color Indicator Circle
    ctx.beginPath();
    ctx.arc(legendX - 6, legendY + 6, 6, 0, Math.PI * 2);
    ctx.fillStyle = slice.color;
    ctx.fill();

    // Slice Label (RTL)
    ctx.textAlign = 'right';
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 12px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.fillText(slice.label, legendX - 22, legendY + 8);

    // Percentage Pill
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    const pillX = 330;
    const pillY = legendY - 5;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, 52, 22, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = slice.color;
    ctx.font = 'bold 11px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${pct}%`, pillX + 26, pillY + 15);

    // Amount Value
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.fillText(formatChartMoney(slice.value), 395, legendY + 9);

    legendY += rowHeight;
  });

  return canvas.toDataURL('image/png');
}

/**
 * Renders an executive Horizontal Bar Chart for cost distribution or comparisons.
 */
export function renderHorizontalBarChart(
  items: BarChartItem[],
  options: {
    title: string;
    subtitle?: string;
    width?: number;
    height?: number;
  }
): string {
  if (typeof document === 'undefined') {
    return '';
  }

  const width = options.width || 700;
  const height = options.height || Math.max(340, items.length * 42 + 90);
  const scale = 2; // Retina sharpness

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.scale(scale, scale);

  // Background Card
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Border
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

  // Title Header (RTL)
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(options.title, width - 24, 30);

  if (options.subtitle) {
    ctx.fillStyle = '#64748b';
    ctx.font = '11px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.fillText(options.subtitle, width - 24, 48);
  }

  // Gold accent bar
  ctx.fillStyle = '#b8903e';
  ctx.fillRect(width - 60, options.subtitle ? 56 : 38, 36, 3);

  const maxValue = Math.max(...items.map(i => i.value), 1);
  const startY = options.subtitle ? 78 : 65;
  const rowHeight = 36;
  const barMaxWidth = 280;
  const barHeight = 16;

  items.forEach((item, idx) => {
    const y = startY + idx * rowHeight;
    const barWidth = Math.max(8, (item.value / maxValue) * barMaxWidth);

    // Label on the right (RTL)
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 12px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(item.label, width - 24, y + 12);

    // Track background
    const barX = 170;
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.roundRect(barX, y, barMaxWidth, barHeight, 4);
    ctx.fill();

    // Bar fill
    if (item.value > 0) {
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.roundRect(barX, y, barWidth, barHeight, 4);
      ctx.fill();
    }

    // Value text on the left of the bar
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 11px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(item.formattedValue || formatChartMoney(item.value), 18, y + 12);

    // Percentage badge if present
    if (item.percentage !== undefined) {
      ctx.fillStyle = '#64748b';
      ctx.font = '10px "Segoe UI", Tahoma, Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${item.percentage.toFixed(1)}%`, barX - 10, y + 12);
    }
  });

  return canvas.toDataURL('image/png');
}

/**
 * Renders a side-by-side Progress Metric Card (e.g. Total Sales vs Collected vs Remaining).
 */
export function renderProgressComparisonChart(
  metrics: {
    title: string;
    totalAmount: number;
    collectedAmount: number;
    remainingAmount: number;
    completionPct: number;
  },
  options: {
    width?: number;
    height?: number;
  } = {}
): string {
  if (typeof document === 'undefined') {
    return '';
  }

  const width = options.width || 700;
  const height = options.height || 220;
  const scale = 2;

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

  // Header
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(metrics.title, width - 24, 30);

  // Accent
  ctx.fillStyle = '#b8903e';
  ctx.fillRect(width - 60, 38, 36, 3);

  // Three Stat Columns
  const cols = [
    { label: 'إجمالي قيمة التعاقدات والمبيعات', value: metrics.totalAmount, color: '#0f172a' },
    { label: 'المحصل كاش وخزينة فعلياً', value: metrics.collectedAmount, color: '#047857' },
    { label: 'المتبقي كأقساط وعقود مستحقة', value: metrics.remainingAmount, color: '#b45309' }
  ];

  const colWidth = (width - 48) / 3;
  cols.forEach((c, idx) => {
    const x = width - 24 - idx * colWidth;
    ctx.textAlign = 'right';
    ctx.fillStyle = '#64748b';
    ctx.font = '11px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.fillText(c.label, x, 75);

    ctx.fillStyle = c.color;
    ctx.font = 'bold 16px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.fillText(formatChartMoney(c.value), x, 100);
  });

  // Big Progress Bar
  const barY = 135;
  const barWidth = width - 48;
  const barHeight = 22;

  // Background track
  ctx.fillStyle = '#f1f5f9';
  ctx.beginPath();
  ctx.roundRect(24, barY, barWidth, barHeight, 6);
  ctx.fill();

  // Collected fill
  const fillWidth = Math.max(12, (metrics.completionPct / 100) * barWidth);
  ctx.fillStyle = '#047857';
  ctx.beginPath();
  ctx.roundRect(24, barY, fillWidth, barHeight, 6);
  ctx.fill();

  // Percentage badge inside or above bar
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (fillWidth > 60) {
    ctx.fillText(`${metrics.completionPct.toFixed(1)}% محصل`, 24 + fillWidth / 2, barY + barHeight / 2);
  }

  // Subtitle notes
  ctx.fillStyle = '#64748b';
  ctx.font = '11px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(
    `نسبة التحصيل الفعلي: ${metrics.completionPct.toFixed(1)}% من إجمالي العقود • المتبقي مستحق وفق جدولة الأقساط`,
    width - 24,
    185
  );

  return canvas.toDataURL('image/png');
}
