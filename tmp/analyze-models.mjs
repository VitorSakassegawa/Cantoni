import fs from 'fs'

let content = fs.readFileSync('tmp/models.json', 'utf16le')
if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1)
const data = JSON.parse(content)

console.log('--- GEMINI MODELS ANALYSIS ---')
data.models.filter(m => m.name.includes('gemini-2') || m.name.includes('gemini-3')).forEach(m => {
  console.log(`ID: ${m.name}`)
  console.log(`Display: ${m.displayName}`)
  console.log(`Methods: ${m.supportedGenerationMethods.join(', ')}`)
  console.log('------------------------------')
})
