import { extractAndParseJSON } from './lib/ai'

function test() {
  const cases = [
    {
      name: 'Normal JSON',
      input: '{"module": "grammar", "questions": []}'
    },
    {
      name: 'Markdown Fenced',
      input: '```json\n{"module": "grammar", "questions": []}\n```'
    },
    {
      name: 'Preamble and Postamble',
      input: 'Sure, here is your JSON: {"module": "grammar", "questions": []} Hope this helps!'
    },
    {
      name: 'Malformed JSON (but extractable block)',
      input: 'Text before { "key": "value" } Text after'
    }
  ]

  cases.forEach(c => {
    try {
      const result = extractAndParseJSON(c.input)
      console.log(`[PASS] ${c.name}:`, result)
    } catch (e) {
      console.log(`[FAIL] ${c.name}:`, e.message)
    }
  })
}

test()
