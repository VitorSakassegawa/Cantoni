import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()
const allowedClientImports = new Set([
  path.join(projectRoot, 'app', '(dashboard)', 'aluno', 'teste-nivel', 'page.tsx'),
  path.join(projectRoot, 'app', '(dashboard)', 'professor', 'nivelamento', 'page.tsx'),
  path.join(projectRoot, 'app', '(dashboard)', 'professor', 'alunos', '[id]', 'contrato', 'novo', 'page.tsx'),
])

function collectFiles(dir: string, acc: string[] = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue

    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      collectFiles(fullPath, acc)
      continue
    }

    if (/\.(ts|tsx|mts)$/.test(entry.name)) {
      acc.push(fullPath)
    }
  }

  return acc
}

const matches = collectFiles(path.join(projectRoot, 'app')).filter((filePath) => {
  const content = fs.readFileSync(filePath, 'utf8')
  return content.includes("from '@/lib/supabase/client'")
})

assert.deepEqual(
  [...matches].sort(),
  [...allowedClientImports].sort(),
  `Unexpected browser Supabase client imports found:\n${matches.join('\n')}`
)

console.log('supabase-browser-usage-guard tests passed')
