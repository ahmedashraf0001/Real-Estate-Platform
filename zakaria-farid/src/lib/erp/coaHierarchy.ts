export interface TreeNodeCategory {
  id: string;
  code: string;
  titleAr: string;
  titleEn: string;
  subcategories: Array<{
    id: string;
    code: string;
    titleAr: string;
    titleEn: string;
    accountCodes: string[];
  }>;
}

export const HIERARCHY_STRUCTURE: TreeNodeCategory[] = [
  {
    id: 'cat_1',
    code: '1',
    titleAr: 'الأصول',
    titleEn: 'Assets',
    subcategories: [
      {
        id: 'sub_11',
        code: '11',
        titleAr: 'الأصول المتداولة',
        titleEn: 'Current Assets',
        accountCodes: ['101000', '102000', '102100', '103000', '103200', '103300', '104000', '105000']
      },
      {
        id: 'sub_12',
        code: '12',
        titleAr: 'الأصول غير المتداولة',
        titleEn: 'Non-Current Assets',
        accountCodes: ['150000', '151000', '152000', '153000', '156000']
      }
    ]
  },
  {
    id: 'cat_2',
    code: '2',
    titleAr: 'الخصوم والالتزامات',
    titleEn: 'Liabilities',
    subcategories: [
      {
        id: 'sub_21',
        code: '21',
        titleAr: 'الخصوم المتداولة',
        titleEn: 'Current Liabilities',
        accountCodes: ['201000', '203000', '204000', '206200', '207000']
      },
      {
        id: 'sub_22',
        code: '22',
        titleAr: 'الخصوم غير المتداولة',
        titleEn: 'Non-Current Liabilities',
        accountCodes: ['202000', '202500']
      }
    ]
  },
  {
    id: 'cat_3',
    code: '3',
    titleAr: 'حقوق الملكية',
    titleEn: 'Equity',
    subcategories: [
      {
        id: 'sub_31',
        code: '31',
        titleAr: 'رأس المال',
        titleEn: 'Capital',
        accountCodes: ['301000']
      },
      {
        id: 'sub_32',
        code: '32',
        titleAr: 'الاحتياطيات',
        titleEn: 'Reserves',
        accountCodes: ['304000']
      },
      {
        id: 'sub_33',
        code: '33',
        titleAr: 'الأرباح والخسائر المرحلة والتوزيعات',
        titleEn: 'Retained Earnings & Distributions',
        accountCodes: ['302000', '303000']
      }
    ]
  },
  {
    id: 'cat_4',
    code: '4',
    titleAr: 'الإيرادات',
    titleEn: 'Revenue',
    subcategories: [
      {
        id: 'sub_41',
        code: '41',
        titleAr: 'إيرادات بيع الوحدات',
        titleEn: 'Realized Sales Revenue',
        accountCodes: ['401000']
      },
      {
        id: 'sub_42',
        code: '42',
        titleAr: 'إيرادات غرامات وفسخ العقود',
        titleEn: 'Cancellation Penalties',
        accountCodes: ['430100']
      },
      {
        id: 'sub_43',
        code: '43',
        titleAr: 'إيرادات وفروق أخرى',
        titleEn: 'Other Revenues & FX',
        accountCodes: ['440000']
      }
    ]
  },
  {
    id: 'cat_5',
    code: '5',
    titleAr: 'المصروفات والتكاليف',
    titleEn: 'Expenses',
    subcategories: [
      {
        id: 'sub_51',
        code: '51',
        titleAr: 'تكلفة الشقق والوحدات المباعة (COGS)',
        titleEn: 'Cost of Goods Sold (COGS)',
        accountCodes: ['501000', '502000', '503000', '504000']
      },
      {
        id: 'sub_52',
        code: '52',
        titleAr: 'مصروفات التسويق والمبيعات',
        titleEn: 'Sales & Marketing',
        accountCodes: ['601000']
      },
      {
        id: 'sub_53',
        code: '53',
        titleAr: 'المصروفات الإدارية والعمومية',
        titleEn: 'General & Administrative',
        accountCodes: ['602000']
      },
      {
        id: 'sub_55',
        code: '55',
        titleAr: 'مصروفات المشروعات وموقع العمل',
        titleEn: 'Site & Project Expenses',
        accountCodes: ['603000', '604000']
      }
    ]
  }
];
