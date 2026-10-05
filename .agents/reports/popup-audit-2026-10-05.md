# ERP action popups & triggers audit — 2026-10-05

Scope: every modal mounted by `ERPWorkstationShell` or by a view, and every button that opens one.
Method: static trace of setter call sites + clicking the treasury actions live (/fin-os/ar/operations).

## P0 — wrong money routing (ledger correctness)

1. **InstaPay recorded in the Safe (101000)** for partner funding and partner payouts.
   `ERPWorkstationContext.tsx` `handleConfirmPartnerPayout` (~3502) and `handleConfirmPartnerInjection` (~3631):
   `routingAccount = paymentMethod === 'BANK_102000' ? '102000' : '101000'` → `INSTAPAY_102000` posts to 101000.
   The popups even print "تحويل إنستاباي فوري — تحويل للخزينة (101000)" and preview Dr/Cr 101000.
   User rule: InstaPay = 102000.
2. **Contractor payable settlement posts to the Safe for InstaPay too.** `CostPayableSettlementModal` only
   offers `CASH_101000` / `INSTAPAY_101000`; `handleRecordCostPayablePayment` guards and credits 101000.
3. Partner payout preview headers read "مدين (له فلوس) / دائن (عليه فلوس)": the parentheticals are wrong
   and confusing. Use plain "مدين / دائن".

## P1 — actions that open the wrong popup or auto-pick a target

| Trigger | What happens | Should happen |
|---|---|---|
| Ops › إجراءات الخزينة › **تحصيل قسط** | `onOpenCashReceipt` picks the FIRST pending PDC/contract, else opens the **construction expense** popup | Collection popup with contract → installment picker |
| Ops › **سداد مستخلص مقاول** | auto-picks earliest unpaid installment; none → opens **expense** popup | `CostPayableSettlementModal` with its own contractor/item/installment picker (already supported via `availableCosts` + `properties`, just not passed) |
| `?action=receipt` (Ops + Cockpit route views) | same first-PDC auto-pick; fallback = expense popup | same as تحصيل قسط |
| Sidebar **+ طلب جديد** | always opens construction expense | small menu: سند قبض / سند صرف / مصروف / عقد جديد |
| Cockpit › عملية جديدة › **تحصيل قسط عميل** | navigates to agenda page (or inspects `contracts[0]`) | open collection popup |
| Cockpit › **سند صرف / شيك** | cheque wording; opens NewCheque/expense | rename "سند صرف"; open payment popup |
| Cockpit › **قيد يومية يدوي** | navigates to ledger with `openNewEntry` — nothing handles it (dead) | either build manual JE popup or remove item |
| Vault › ملحق عقد (`onOpenNewSupplement`) | preselects `contracts[0]` when no id | require choosing a contract (modal has a select; drop the fallback) |
| `handleOpenAuditForProperty` (~4136) | `prop \|\| data.properties[0]` | no fallback |

## P1 — collection popups are split and the picker can't see schedules

- Two collection popups: `CashCollectionReceiptModal` (via `showPayModal`, handler `handleCollectPayment`,
  fixed contract+schedule, no picker) and `HandCollectionModal` (via `collectingPDCItem`, handler
  `handleConfirmHandCollection`, has a picker but it lists `pdcRecords` only).
- No cheques are created any more, so `HandCollectionModal`'s picker is empty for new contracts; only
  callers that build a synthetic `SCH-` item (vault, ops dues card) work.
- Fix: one collection popup whose picker is built from active-contract schedules
  (`Pending | Partially Paid | Defaulted`, remaining > 0), grouped by contract, searchable by buyer/contract/unit;
  method = نقدي (101000) / إنستاباي (102000). Keep `handleConfirmHandCollection` as the single posting path.

## P2 — missing entry points for things the business does

- **Internal transfer Safe ⇄ InstaPay** (e.g. depositing cash): no handler, no popup. The cash book already
  classifies transfers, so only a popup + JE (Dr dest / Cr source, cash guard on source) is needed.
- **Manual journal entry**: advertised in cockpit menu, not implemented (see above).
- Partner popups: project picker exists; OK.

## OK (target picker present or opened from a specific row)

ZFDirectExpenseModal (property picker) · RSVAllocationModal (property) · RescissionSettlementModal (contract) ·
ContractEscalationModal (contract) · PartnerCapitalInjection/Payout/Operations (partner + project) ·
NewPartnerCommitment (property) · ConstructionPurchaseOrderModal (property; button in construction side panel) ·
HandoverExecutionModal (from contract row only) · CostAdjustment/EditPropertyCost (from cost row) ·
NewContractWizardModal (property/unit/lead pickers).
