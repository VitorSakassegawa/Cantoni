import assert from 'node:assert/strict'

import { stripTeacherOnlySections, extractTeacherOnlySections } from '../lib/lesson-summary-filter.ts'

const summary = `### 📘 Resumo da Aula

**Data:** 02/06/2026

---

### 🎯 Objetivo da Aula
Praticar conversação.

---

### 🗣️ Vocabulário & Expressões
* **vent:** desabafar

---

### ❗ Correções & Melhorias
* **Erro:** "he go"
  **Correção:** "he goes"

---

### 🧩 Padrão de Erros Comuns
* Terceira pessoa do singular.

---

### 📝 Lição de Casa / Prática
1. Criar um diálogo.`

const filtered = stripTeacherOnlySections(summary)

// Teacher-only sections removed
assert.ok(!/Corre[çc][õo]es/i.test(filtered), 'should drop Correções section')
assert.ok(!/Padr[ãa]o de Erros/i.test(filtered), 'should drop Padrão de Erros section')
assert.ok(!/he goes/.test(filtered), 'should drop correction content')
assert.ok(!/Terceira pessoa/.test(filtered), 'should drop error-pattern content')

// Student-facing sections kept
assert.ok(/Objetivo da Aula/.test(filtered), 'keeps objective')
assert.ok(/Vocabul[áa]rio/.test(filtered), 'keeps vocabulary')
assert.ok(/Li[çc][ãa]o de Casa/.test(filtered), 'keeps homework')
assert.ok(/Criar um di[áa]logo/.test(filtered), 'keeps homework content')

// No giant blank gaps left behind
assert.ok(!/\n{3,}/.test(filtered), 'collapses blank gaps')

// Safety on empty/null
assert.equal(stripTeacherOnlySections(''), '')
assert.equal(stripTeacherOnlySections(null), '')
assert.equal(stripTeacherOnlySections('No sections here, just text.'), 'No sections here, just text.')

// extractTeacherOnlySections: returns ONLY the teacher sections (inverse).
const extracted = extractTeacherOnlySections(summary)
assert.ok(/Corre[çc][õo]es/i.test(extracted), 'extract keeps Correções heading')
assert.ok(/he goes/.test(extracted), 'extract keeps correction content')
assert.ok(/Terceira pessoa/.test(extracted), 'extract keeps error-pattern content')
assert.ok(!/Objetivo da Aula/.test(extracted), 'extract drops non-teacher sections')
assert.ok(!/Li[çc][ãa]o de Casa/.test(extracted), 'extract drops homework')
assert.equal(extractTeacherOnlySections('No teacher sections here.'), '')
assert.equal(extractTeacherOnlySections(null), '')

console.log('lesson-summary-filter tests passed')
