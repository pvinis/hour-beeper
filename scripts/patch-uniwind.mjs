import { patchUniwind } from './uniwind-compat.mjs'

const result = patchUniwind()

if (result.patchedFiles.length > 0) {
  console.log(`[patch-uniwind] Patched ${result.patchedFiles.length} file(s)`)
  for (const filePath of result.patchedFiles) {
    console.log(`  - ${filePath}`)
  }
} else {
  console.log('[patch-uniwind] Already patched')
}

if (result.missingFiles.length > 0) {
  console.log(`[patch-uniwind] Skipped missing file(s): ${result.missingFiles.join(', ')}`)
}
