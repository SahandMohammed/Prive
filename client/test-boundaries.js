import { ESLint } from 'eslint';

(async function main() {
  const eslint = new ESLint();
  const results = await eslint.lintFiles(['src/features/dashboard/pages/DashboardPage.tsx']);
  console.log(JSON.stringify(results[0].messages, null, 2));
})().catch(console.error);
