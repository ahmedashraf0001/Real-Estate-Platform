'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type ApexChartsType from 'apexcharts';

type ERPChartSeries = NonNullable<ApexCharts.ApexOptions['series']>;

interface ERPChartRuntime {
  globals: {
    seriesTotals: number[];
    labels?: string[];
    colors?: string[];
    categoryLabels?: string[];
    seriesNames?: string[];
  };
  config?: {
    labels?: string[];
    colors?: string[];
    tooltip?: {
      y?: {
        formatter?: (value: unknown, context: unknown) => string;
      };
    };
    xaxis?: {
      categories?: Array<string | number>;
    };
    series?: Array<{ name?: string }>;
  };
}

interface ERPTooltipContext {
  series: Array<number | Array<number | null | undefined>>;
  seriesIndex: number;
  dataPointIndex: number;
  w: ERPChartRuntime;
}

export interface ERPApexChartProps {
  type: 'line' | 'area' | 'bar' | 'donut' | 'pie' | 'radialBar';
  series: ERPChartSeries;
  options?: ApexCharts.ApexOptions;
  height?: number | string;
  width?: number | string;
  isAr?: boolean;
  primaryColor?: string;
}

export const ERPApexChart: React.FC<ERPApexChartProps> = ({
  type,
  series,
  options = {},
  height = 300,
  width = '100%',
  isAr = true,
  primaryColor,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<ApexChartsType | null>(null);
  const [isChartReady, setIsChartReady] = useState(false);
  const [themeAccent, setThemeAccent] = useState<string>('#2563eb');
  const seriesRef = useRef(series);
  const optionsRef = useRef(options);

  useEffect(() => {
    seriesRef.current = series;
  }, [series]);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {

    const checkAccent = () => {
      if (typeof window !== 'undefined' && chartContainerRef.current) {
        const val = getComputedStyle(chartContainerRef.current).getPropertyValue('--erp-accent').trim();
        if (val && val !== themeAccent) {
          setThemeAccent(val);
        }
      }
    };

    const accentFrame = window.requestAnimationFrame(checkAccent);
    window.addEventListener('storage', checkAccent);
    const observer = new MutationObserver(checkAccent);
    if (document.documentElement) {
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class'] });
    }

    return () => {
      window.cancelAnimationFrame(accentFrame);
      window.removeEventListener('storage', checkAccent);
      observer.disconnect();
    };
  }, [themeAccent]);

  const effectiveAccent = primaryColor || themeAccent || '#2563eb';

  const getBaseDefaults = useCallback((): ApexCharts.ApexOptions => {
    return {
      chart: {
        type,
        height,
        width,
        toolbar: { show: false },
        fontFamily: "'ThmanyahSans', 'Cairo', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 600,
          animateGradually: {
            enabled: true,
            delay: 150,
          },
          dynamicAnimation: {
            enabled: true,
            speed: 350,
          },
        },
        background: 'transparent',
      },
      colors: [effectiveAccent, '#334155', '#0d9488', '#f59e0b'],
      stroke: {
        curve: 'smooth',
        width: type === 'donut' || type === 'pie' ? 2 : (type === 'area' || type === 'line' ? [3.5, 2.5] : 2.5),
        colors: type === 'donut' || type === 'pie' ? ['#ffffff'] : undefined,
      },
      markers: {
        size: 0,
        colors: ['#ffffff'],
        strokeColors: [effectiveAccent, '#334155', '#0d9488', '#f59e0b'],
        strokeWidth: 2.5,
        hover: {
          size: 5.5,
          sizeOffset: 2,
        },
      },
      plotOptions: {
        pie: {
          donut: {
            size: '72%',
            labels: {
              show: true,
              name: {
                show: true,
                fontSize: '12px',
                fontFamily: 'inherit',
                color: '#64748b',
                offsetY: -4,
              },
              value: {
                show: true,
                fontSize: '15px',
                fontWeight: 700,
                fontFamily: 'inherit',
                color: '#0f172a',
                offsetY: 4,
                formatter: (val: string) => {
                  const num = parseFloat(val);
                  if (isNaN(num)) return val;
                  return `${num.toLocaleString('en-US')} ${isAr ? 'ج.م' : 'EGP'}`;
                },
              },
              total: {
                show: true,
                label: isAr ? 'المجموع' : 'Total',
                fontSize: '11px',
                fontWeight: 600,
                color: '#94a3b8',
                formatter: (w: any) => {
                  const sum = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                  if (sum >= 1_000_000) return `${(sum / 1_000_000).toFixed(1)}M`;
                  if (sum >= 1_000) return `${(sum / 1_000).toFixed(0)}k`;
                  return `${sum.toLocaleString('en-US')}`;
                },
              },
            },
          },
        },
      },
      fill: {
        type: type === 'area' ? 'gradient' : 'solid',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: type === 'area' ? 0.35 : 0.14,
          opacityTo: 0.02,
          stops: [0, 95, 100],
        },
      },
      grid: {
        borderColor: '#e2e8f0',
        strokeDashArray: 2,
        xaxis: { lines: { show: true } },
        yaxis: { lines: { show: true } },
        padding: {
          top: 5,
          right: 15,
          bottom: 5,
          left: 15,
        },
      },
      dataLabels: {
        enabled: false,
      },
      tooltip: {
        enabled: true,
        theme: 'light',
        shared: type === 'area' || type === 'line',
        intersect: false,
        style: {
          fontSize: '12px',
          fontFamily: "'ThmanyahSans', 'Cairo', 'Plus Jakarta Sans', sans-serif",
        },
        custom: function({ series, seriesIndex, dataPointIndex, w }: any) {
          if (type === 'donut' || type === 'pie') {
            const label = w.globals.labels?.[seriesIndex] || w.config?.labels?.[seriesIndex] || '';
            const val = series[seriesIndex];
            const yFormatter = w.config?.tooltip?.y?.formatter;
            const formatted = yFormatter
              ? yFormatter(val, { series, seriesIndex, dataPointIndex: 0, w })
              : (typeof val === 'number' ? `${val.toLocaleString('en-US')} ${isAr ? 'ج.م' : 'EGP'}` : `${val}`);
            const color = w.globals.colors?.[seriesIndex] || w.config?.colors?.[seriesIndex] || effectiveAccent;
            return `
              <div style="
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 8px 12px;
                box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
                direction: ${isAr ? 'rtl' : 'ltr'};
                text-align: ${isAr ? 'right' : 'left'};
                font-family: inherit;
              ">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="width: 8px; height: 8px; border-radius: 50%; background-color: ${color}; display: inline-block;"></span>
                  <span style="font-size: 11px; color: #64748b; font-weight: 500;">${label}</span>
                </div>
                <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 4px; font-variant-numeric: tabular-nums;">
                  ${formatted}
                </div>
              </div>
            `;
          }

          const category = w.globals.categoryLabels?.[dataPointIndex] || w.globals.labels?.[dataPointIndex] || w.config?.xaxis?.categories?.[dataPointIndex] || '';
          const seriesNames = w.globals.seriesNames?.length ? w.globals.seriesNames : (w.config?.series?.map((s: any) => s.name) || []);
          const colors = w.globals.colors?.length ? w.globals.colors : (w.config?.colors || [effectiveAccent, '#334155']);

          let itemsHtml = '';
          for (let i = 0; i < series.length; i++) {
            const val = (series as any)[i]?.[dataPointIndex];
            if (val === undefined || val === null) continue;
            const yFormatter = w.config?.tooltip?.y?.formatter;
            const formatted = yFormatter
              ? yFormatter(val, { series, seriesIndex: i, dataPointIndex, w })
              : (typeof val === 'number' ? `${val.toLocaleString('en-US')} ${isAr ? 'ج.م' : 'EGP'}` : `${val}`);
            const sName = seriesNames[i] || '';
            const dotColor = colors[i] || effectiveAccent;

            itemsHtml += `
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-top: 5px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="width: 8px; height: 8px; border-radius: 50%; background-color: ${dotColor}; display: inline-block; flex-shrink: 0;"></span>
                  <span style="font-size: 11px; color: #64748b; font-weight: 500;">${sName}</span>
                </div>
                <span style="font-size: 12px; font-weight: 600; color: #0f172a; font-variant-numeric: tabular-nums;">${formatted}</span>
              </div>
            `;
          }

          return `
            <div style="
              background: #ffffff;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 8px 12px;
              box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
              direction: ${isAr ? 'rtl' : 'ltr'};
              text-align: ${isAr ? 'right' : 'left'};
              font-family: inherit;
              min-width: 190px;
            ">
              <div style="font-size: 11px; font-weight: 600; color: #94a3b8; margin-bottom: 4px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">
                ${category}
              </div>
              ${itemsHtml}
            </div>
          `;
        },
      },
      xaxis: {
        axisBorder: { show: true, color: '#cbd5e1' },
        axisTicks: { show: true, color: '#cbd5e1' },
        labels: {
          style: {
            colors: '#94a3b8',
            fontSize: '11px',
            fontWeight: 500,
          },
        },
      },
      yaxis: {
        opposite: isAr && (type === 'area' || type === 'line'),
        axisBorder: { show: true, color: '#cbd5e1' },
        labels: {
          style: {
            colors: '#94a3b8',
            fontSize: '11px',
            fontWeight: 500,
          },
          formatter: (val: number) => {
            if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
            if (val >= 1_000) return `${(val / 1_000).toFixed(0)}k`;
            return `${val}`;
          },
        },
      },
      legend: {
        show: type === 'donut' || type === 'pie',
        position: 'bottom',
        fontSize: '12px',
        fontFamily: 'inherit',
        labels: {
          colors: '#475569',
        },
        markers: {
          size: 5,
          shape: 'circle',
        },
      },
    };
  }, [type, height, width, isAr, effectiveAccent]);

  const buildMergedOptions = useCallback((customOpts: ApexCharts.ApexOptions, customSeries: ERPChartSeries): ApexCharts.ApexOptions => {
    const defaults = getBaseDefaults();
    return {
      ...defaults,
      ...customOpts,
      chart: {
        ...defaults.chart,
        ...customOpts.chart,
        type,
        height,
        width,
        animations: {
          ...defaults.chart?.animations,
          ...customOpts.chart?.animations,
          enabled: customOpts.chart?.animations?.enabled ?? true,
          dynamicAnimation: {
            ...defaults.chart?.animations?.dynamicAnimation,
            ...customOpts.chart?.animations?.dynamicAnimation,
            enabled: customOpts.chart?.animations?.dynamicAnimation?.enabled
              ?? customOpts.chart?.animations?.enabled
              ?? true,
          },
        },
      },
      tooltip: {
        ...defaults.tooltip,
        ...customOpts.tooltip,
        y: {
          ...defaults.tooltip?.y,
          ...customOpts.tooltip?.y,
        },
        custom: customOpts.tooltip?.custom ?? defaults.tooltip?.custom,
      },
      series: customSeries,
    };
  }, [getBaseDefaults, type, height, width]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    let chart: ApexChartsType | null = null;
    let isCancelled = false;

    // Dynamically load ApexCharts on the client side only.
    import('apexcharts')
      .then(async (module) => {
        if (isCancelled || !chartContainerRef.current) return;
        const ApexChartsClass = module.default || module;

        const latestOptions = optionsRef.current || {};
        const latestSeries = seriesRef.current ?? series;
        const mergedOptions = buildMergedOptions(latestOptions, latestSeries);

        if (chartInstanceRef.current) {
          chartInstanceRef.current.destroy();
          chartInstanceRef.current = null;
        }

        chart = new ApexChartsClass(chartContainerRef.current, mergedOptions);
        chartInstanceRef.current = chart;
        await chart.render();
        if (!isCancelled) setIsChartReady(true);
      })
      .catch((err) => {
        console.error('Failed to initialize ApexCharts:', err);
      });

    return () => {
      isCancelled = true;
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [buildMergedOptions, series, isAr]);

  // Handle dynamic series and option updates while respecting chart animation preferences.
  useEffect(() => {
    if (!chartInstanceRef.current) return;
    try {
      const merged = buildMergedOptions(options, series);
      const shouldAnimate = options.chart?.animations?.enabled ?? true;
      chartInstanceRef.current.updateOptions(merged, true, shouldAnimate);
    } catch (err) {
      console.warn('ApexCharts updateOptions failed:', err);
    }
  }, [series, options, buildMergedOptions]);

  return (
    <div
      style={{
        width: '100%',
        minHeight: typeof height === 'number' ? `${height}px` : height,
        position: 'relative',
      }}
    >
      <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />
      {!isChartReady && (
        <div
          style={{
            height: typeof height === 'number' ? `${height}px` : 260,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            fontSize: '12px',
          }}
        >
          {isAr ? 'جاري تحميل الرسم البياني...' : 'Loading visualization...'}
        </div>
      )}
    </div>
  );
};

export default ERPApexChart;
