---
name: surface-ui
description: >-
  Work-routing track for presentation layer, Arabic RTL localization,
  Executive Alabaster design system, and UI ergonomics in Zakaria Farid Real Estate ERP.
  Enforces single-gated TypeScript verification upon batch completion.
---

# Track: SURFACE_UI (Presentation, RTL Localization & Ergonomics)

## Assigned Role: Executive UI/UX Engineer
- **Model Tier**: `flash`
- **Scoping**: Modifying UI components in `src/components/` and `src/app/`. Restricted shell and database access.

## Guidelines & Principles
1. **Executive Alabaster Aesthetics**:
   - Crisp white/light-gray backgrounds (`#f8fafc`, `#ffffff`), warm gold accents (`#946f23`), subtle borders (`#e2e8f0`), deep slate typography (`#0f172a`).
2. **Natural Egyptian Terminology**:
   - Use clear, self-explanatory phrasing (e.g. `فلوس وممتلكات الشركة (الأصول)`, `مقدمات حجز العملاء`, `مضبوط بالمليم`). Avoid raw academic acronyms like WIP, COGS, A/R.
3. **Ergonomic Modal Flows**:
   - When a user submits an operation in a modal (e.g., logging an expense, collecting an installment, adding a contract supplement):
     - DO NOT immediately close the modal abruptly.
     - Show a confirmed official voucher card with print button (`window.print()`).
     - Provide a quick 1-click button to record another consecutive entry.
4. **Clean Component Form Design**:
   - Eliminate redundant inputs (e.g. do not show an input for building name if already selected in a dropdown).

## Verification Command
```bash
npx tsc --noEmit
```
