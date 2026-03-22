function extractAndParseJSON(text) {
  let content = text.trim()
  
  if (content.startsWith('```')) {
    content = content.replace(/^```(json)?/, '').replace(/```$/, '').trim()
  }

  try {
    return JSON.parse(content)
  } catch (e) {
    const start = content.indexOf('{')
    const end = content.lastIndexOf('}')
    
    if (start !== -1 && end !== -1 && end > start) {
      const jsonBlock = content.substring(start, end + 1)
      try {
        return JSON.parse(jsonBlock)
      } catch (innerError) {
        throw new Error('Could not parse JSON from AI response')
      }
    }
    
    throw e
  }
}

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
    },
    {
        name: 'Empty/No JSON',
        input: 'There is no JSON here'
    }
  ]

  cases.forEach(c => {
    try {
      const result = extractAndParseJSON(c.input)
      console.log(`[PASS] ${c.name}:`, JSON.stringify(result))
    } catch (e) {
      console.log(`[FAIL] ${c.name}:`, e.message)
    }
  })
}

test()
