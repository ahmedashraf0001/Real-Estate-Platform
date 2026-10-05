'use client';

import React from 'react';
import { ChevronDown, Info, AlertTriangle, AlertOctagon, CheckCircle2 } from 'lucide-react';
import f from './ZFForm.module.css';

/** Class names for raw controls: <input className={zfForm.control} />, money inputs add zfForm.money. */
export const zfForm = f;

interface ZFFieldProps {
  label: React.ReactNode;
  required?: boolean;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  /** Small text or link at the end of the label row (e.g. "+ new partner"). */
  aside?: React.ReactNode;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}

export function ZFField({ label, required, hint, error, aside, htmlFor, className, children }: ZFFieldProps) {
  return (
    <div className={`${f.field}${className ? ` ${className}` : ''}`}>
      <div className={f.labelRow}>
        <label className={f.label} htmlFor={htmlFor}>
          {label}
          {required ? <span className={f.required} aria-hidden="true">*</span> : null}
        </label>
        {aside ? <span className={f.labelAside}>{aside}</span> : null}
      </div>
      {children}
      {error ? <span className={f.error} role="alert">{error}</span> : hint ? <span className={f.hint}>{hint}</span> : null}
    </div>
  );
}

interface ZFMoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'> {
  unit?: string;
  invalid?: boolean;
}

/** Amount input: any decimal (no step trap), LTR digits, unit suffix. */
export const ZFMoneyInput = React.forwardRef<HTMLInputElement, ZFMoneyInputProps>(function ZFMoneyInput(
  { unit = 'ج.م', invalid, ...rest },
  ref
) {
  return (
    <div className={f.moneyWrap}>
      <input
        ref={ref}
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        className={`${f.control} ${f.money}${invalid ? ` ${f.controlInvalid}` : ''}`}
        {...rest}
      />
      <span className={f.moneyUnit}>{unit}</span>
    </div>
  );
});

export interface ZFChoiceOption<T extends string> {
  id: T;
  label: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface ZFChoicesProps<T extends string> {
  options: ZFChoiceOption<T>[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel?: string;
}

export function ZFChoices<T extends string>({ options, value, onChange, ariaLabel }: ZFChoicesProps<T>) {
  return (
    <div className={f.choices} role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={o.disabled}
            className={`${f.choice}${active ? ` ${f.choiceActive}` : ''}`}
            onClick={() => onChange(o.id)}
          >
            {o.icon ? <span className={f.choiceIcon}>{o.icon}</span> : null}
            <span className={f.choiceTexts}>
              <span className={f.choiceLabel}>{o.label}</span>
              {o.sub ? <span className={f.choiceSub}>{o.sub}</span> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export interface ZFFact {
  label: React.ReactNode;
  value: React.ReactNode;
  tone?: 'pos' | 'neg';
}

export function ZFFacts({ items }: { items: ZFFact[] }) {
  return (
    <div className={f.facts}>
      {items.map((it, i) => (
        <div key={i} className={f.fact}>
          <span className={f.factLabel}>{it.label}</span>
          <span className={`${f.factValue}${it.tone === 'pos' ? ` ${f.factPos}` : it.tone === 'neg' ? ` ${f.factNeg}` : ''}`}>{it.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Plain-language "what will happen when you save". */
export function ZFEffect({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'danger' | 'success'; children: React.ReactNode }) {
  const Icon = tone === 'warn' ? AlertTriangle : tone === 'danger' ? AlertOctagon : tone === 'success' ? CheckCircle2 : Info;
  const cls = tone === 'warn' ? f.effectWarn : tone === 'danger' ? f.effectDanger : '';
  return (
    <div className={`${f.effect}${cls ? ` ${cls}` : ''}`}>
      <Icon size={15} className={f.effectIcon} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export interface ZFJournalLine {
  code: string;
  name: React.ReactNode;
  debit?: string | number;
  credit?: string | number;
}

/** Journal entry preview, collapsed by default (for the accountant, not in the way of the user). */
export function ZFJournalPeek({ lines, isAr = true }: { lines: ZFJournalLine[]; isAr?: boolean }) {
  const fmt = (v?: string | number) => {
    const n = Number(v) || 0;
    return n ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
  };
  return (
    <details className={f.journal}>
      <summary>
        <ChevronDown size={13} aria-hidden="true" />
        {isAr ? 'عرض القيد المحاسبي' : 'Show journal entry'}
      </summary>
      <table className={f.journalTable}>
        <thead>
          <tr>
            <th>{isAr ? 'الحساب' : 'Account'}</th>
            <th className={f.journalNum}>{isAr ? 'مدين' : 'Debit'}</th>
            <th className={f.journalNum}>{isAr ? 'دائن' : 'Credit'}</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i}>
              <td><span className={f.journalCode}>{l.code}</span>{l.name}</td>
              <td className={f.journalNum}>{fmt(l.debit)}</td>
              <td className={f.journalNum}>{fmt(l.credit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

/** Footer layout: optional note on the start side, actions on the end side. */
export function ZFFormFooter({ aside, children }: { aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={f.footer}>
      {aside ? <span className={f.footerAside}>{aside}</span> : null}
      <div className={f.footerActions}>{children}</div>
    </div>
  );
}

/** Success panel shown inside the popup after saving. */
export function ZFFormDone({ title, text, children }: { title: React.ReactNode; text?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className={f.done}>
      <span className={f.doneIcon}><CheckCircle2 size={22} /></span>
      <h4 className={f.doneTitle}>{title}</h4>
      {text ? <p className={f.doneText}>{text}</p> : null}
      {children}
    </div>
  );
}
