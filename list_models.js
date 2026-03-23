const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    const result = await genAI.listModels();
    console.log(JSON.stringify(result.models.map(m => m.name), null, 2));
  } catch (e) {
    console.error(e.message);
  }
}

listModels();
