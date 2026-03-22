const { GoogleGenerativeAI } = require('@google/generative-ai');

async function run() {
  const apiKey = 'AIzaSyAqFUwPOVtPBvKypw2IrFTZML8jbAbu6PE';
  const genAI = new GoogleGenerativeAI(apiKey);
  try {
    const models = await genAI.listModels();
    console.log(JSON.stringify(models, null, 2));
  } catch (error) {
    console.error('Error listing models:', error);
  }
}

run();
