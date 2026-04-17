import { verifyUniwindCompat } from './uniwind-compat.mjs'

const result = verifyUniwindCompat()

console.log(`[verify-uniwind-compat] Verified ${result.checkedFiles.length} file(s)`)
for (const filePath of result.checkedFiles) {
  console.log(`  - ${filePath}`)
}
