import { GoogleGenerativeAI } from '@google/generative-ai'
import dotenv from 'dotenv'
import path from 'path'

// Load .env.local from the project root
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('GEMINI_API_KEY not found in .env.local')
    return
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  
  try {
    const result = await genAI.listModels()
    console.log('--- AVAILABLE MODELS ---')
    result.models.forEach(model => {
      console.log(`ID: ${model.name}`)
      console.log(`Methods: ${model.supportedGenerationMethods.join(', ')}`)
      console.log(`Description: ${model.description}`)
      console.log('------------------------')
    })
  } catch (error) {
    console.error('Error listing models:', error)
  }
}

listModels()
