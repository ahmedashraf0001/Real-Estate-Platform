import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import * as helpers from '../projectStatusHelper';

// Execute the production action with test dependencies, never a test bypass in the server action.
export function loadSaveProperty(client: any, user: any = { id: 'admin' }, revalidate = () => {}) {
  const code = ts.transpileModule(fs.readFileSync(path.resolve('src/app/actions/properties.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const imports: Record<string, any> = {
    '@supabase/ssr': {},
    '@/lib/supabase/server': { createClient: async () => ({ ...client, auth: { getUser: async () => ({ data: { user } }) } }) },
    'next/cache': { revalidatePath: revalidate },
    '@/lib/services/emailService': { sendNewPropertyAlerts: async () => {} },
    '@/lib/erp/projectStatusHelper': helpers,
  };
  const exports: any = {};
  vm.runInNewContext(code, { exports, process: { env: {} }, console,
    require(id: string) {
      if (id in imports) return imports[id];
      throw new Error(`Unexpected test import ${id}`);
    },
  }, { filename: 'src/app/actions/properties.ts' });
  return exports.saveProperty;
}
