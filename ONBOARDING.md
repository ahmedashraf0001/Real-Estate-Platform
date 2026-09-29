# Onboarding Guide: Zakaria Farid Real Estate ERP (v3.0.0)

مرحباً بك في المنظومة الهندسية لمؤسسة **زكريا فريد للتطوير والاستثمار العقاري**.
هذا الدليل يوضح للمطورين والوكلاء الذكيين كيفية تشغيل واختبار النظام ومحاكاة رحلات العمل.

---

## 1. هيكل المشروع (Project Architecture)

- **`Real-Estate-Platform/`**: الجذر الرئيسي لمستودع Git ويحتوي على ملفات الـ Harness (`AGENTS.md`, `PROJECT_SPEC.md`, `HARNESS_RATIONALE.md`, `.agents/`).
- **`zakaria-farid/`**: تطبيق الويب المتكامل مبني بـ Next.js 15 (App Router) و TypeScript و Supabase.
  - `src/lib/erp/`: المحرك المالي والمحاسبي الصارم (BigInt Decimal, القيود المزدوجة, حسابات الأقساط, الشركاء, الإشعارات, مستحقات المقاولين).
  - `src/components/`: واجهات المستخدم بتصميم FIN-OS Executive Design System مع دعم كامل للغة العربية (RTL).
  - `supabase/migrations/`: ملفات التهيئة وتريجرات الأمان وحماية RLS على مستوى قاعدة البيانات.

---

## 2. أوامر التحقق السريع (Verification Commands)

يتم تنفيذ الأوامر داخل مجلد التطبيق `zakaria-farid/`:

```bash
cd zakaria-farid

# فحص الأخطاء البرمجية والأنماط (Strict TypeScript Typecheck)
npx tsc --noEmit

# تشغيل حزمة الاختبارات الشاملة (244 اختبار عبر 66 جناح للمحاكاة والقواعد المحاسبية والإشعارات و RLS)
npm test

# تشغيل فاحص البوابات الميكانيكية الموحد (Gatekeeper Script)
bash ../.agents/scripts/verify_gates.sh
```

---

## 3. مسارات العمل والأدوار (Tracks & Subagents)

| المسار (Track) | الدور المتخصص | نموذج الذكاء | البوابة | المهام الرئيسية |
| :--- | :--- | :---: | :---: | :--- |
| `WORKFLOW_AUDIT` | `Workflow Simulator & Auditor` | `flash` (صارم) | Dual | محاكاة رحلات المستخدمين، الستريس تيست، وتصنيف السلاسة (سهل/صعب/خاطئ/مستحيل) |
| `FINANCIAL_CORE` | `Financial Calculation Engineer` | `flash` (صارم) | Dual | المحرك المالي والقيود المزدوجة ومطابقة الأقساط والشركاء |
| `SURFACE_UI` | `Executive UI/UX Engineer` | `flash` (صارم) | Single | تصميم وتطوير الواجهات، الأنماط، وسلاسة تدفق النوافذ |
| `DATABASE_SCHEMA` | `Database Custodian` | `flash` (صارم) | Dual | المايجريشن، سياسات RLS، وتريجرات الحماية ضد الحذف |

---

## 4. ميثاق التفويض (Section 0)
الـ Orchestrator الرئيسي **ممنوع تماماً من تعديل ملفات التطبيق بيده** (Zero Direct Application Writes). يتم تفويض كل مهمة فوراً للوكيل الفرعي المختص باستخدام أداة Antigravity الأصلية `invoke_subagent` مع `TypeName: "self"`، وتحديد الـ `Role` والمسار، مع الالتزام الصارم بنموذج `Model: "flash"` وحظر نموذج `pro` عبر كافة المسارات. التواصل والاستفسار يتم حصرياً عبر `ask_question`.
