# Onboarding Guide: Zakaria Farid Real Estate ERP (v2.0.0)

مرحباً بك في المنظومة الهندسية لمؤسسة **زكريا فريد للتطوير والاستثمار العقاري**.
هذا الدليل يوضح للمطورين والوكلاء الذكيين كيفية تشغيل واختبار النظام ومحاكاة رحلات العمل.

---

## 1. هيكل المشروع (Project Architecture)

- **`Real-Estate-Platform/`**: الجذر الرئيسي لمستودع Git ويحتوي على ملفات الـ Harness (`AGENTS.md`, `PROJECT_SPEC.md`, `HARNESS_RATIONALE.md`, `.agents/`).
- **`zakaria-farid/`**: تطبيق الويب المتكامل مبني بـ Next.js 16 (App Router) و TypeScript و Supabase.
  - `src/lib/erp/`: المحرك المالي والمحاسبي الصارم (BigInt Decimal, القيود المزدوجة, حسابات الأقساط, الشركاء).
  - `src/components/`: واجهات المستخدم بتصميم Alabaster مع دعم كامل للغة العربية (RTL).
  - `supabase/migrations/`: ملفات التهيئة وتريجرات الأمان على مستوى قاعدة البيانات.

---

## 2. أوامر التحقق السريع (Verification Commands)

يتم تنفيذ الأوامر داخل مجلد التطبيق `zakaria-farid/`:

```bash
cd zakaria-farid

# فحص الأخطاء البرمجية والأنماط (Strict TypeScript Typecheck)
npx tsc --noEmit

# تشغيل اختبارات القواعد المحاسبية الصارمة (26 اختبار مالي)
npm test

# تشغيل فاحص البوابات الميكانيكية الموحد (Gatekeeper Script)
bash ../.agents/scripts/verify_gates.sh
```

---

## 3. مسارات العمل والأدوار (Tracks & Subagents)

| المسار (Track) | الدور المتخصص | نموذج الذكاء | البوابة | المهام الرئيسية |
| :--- | :--- | :---: | :---: | :--- |
| `WORKFLOW_AUDIT` | `Workflow Simulator & Auditor` | `pro` | Dual | محاكاة رحلات المستخدمين، الستريس تيست، وتصنيف السلاسة (سهل/صعب/خاطئ/مستحيل) |
| `FINANCIAL_CORE` | `Financial Calculation Engineer` | `pro` | Dual | المحرك المالي والقيود المزدوجة ومطابقة الأقساط والشركاء |
| `SURFACE_UI` | `Executive UI/UX Engineer` | `flash` | Single | تصميم وتطوير الواجهات، الأنماط، وسلاسة تدفق النوافذ |
| `DATABASE_SCHEMA` | `Database Custodian` | `pro` | Dual | المايجريشن، سياسات RLS، وتريجرات الحماية ضد الحذف |

---

## 4. ميثاق التفويض (Section 0)
الـ Orchestrator الرئيسي **ممنوع تماماً من تعديل ملفات التطبيق بيده**. يتم تفويض كل مهمة فوراً للوكيل الفرعي المختص عبر `invoke_subagent` مع تحديد دوره ونموذجه ومساره.
