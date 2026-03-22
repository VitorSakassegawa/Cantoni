const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testTTS() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('No API key found in env var GEMINI_API_KEY');
    process.exit(1);
  }
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-tts' });

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: "Hello, this is a test audio message." }] }],
      generationConfig: {
        responseModalities: ["AUDIO"]
      }
    });
    
    const response = await result.response;
    // console.log(JSON.stringify(response, null, 2));

    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (part) {
      console.log('--- Audio Data Found ---');
      console.log('MimeType:', part.inlineData.mimeType);
      
      const pcmBase64 = part.inlineData.data;
      const pcmBuffer = Buffer.from(pcmBase64, 'base64');
      
      // WAV Header for 16-bit, 24kHz, 1 channel PCM
      const sampleRate = 24000;
      const numChannels = 1;
      const bitsPerSample = 16;
      const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
      const blockAlign = numChannels * (bitsPerSample / 8);
      const dataSize = pcmBuffer.length;
      const chunkSize = 36 + dataSize;
      
      const header = Buffer.alloc(44);
      // RIFF chunk descriptor
      header.write('RIFF', 0);
      header.writeUInt32LE(chunkSize, 4);
      header.write('WAVE', 8);
      // fmt sub-chunk
      header.write('fmt ', 12);
      header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
      header.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
      header.writeUInt16LE(numChannels, 22);
      header.writeUInt32LE(sampleRate, 24);
      header.writeUInt32LE(byteRate, 28);
      header.writeUInt16LE(blockAlign, 32);
      header.writeUInt16LE(bitsPerSample, 34);
      // data sub-chunk
      header.write('data', 36);
      header.writeUInt32LE(dataSize, 40);
      
      const wavBuffer = Buffer.concat([header, pcmBuffer]);
      require('fs').writeFileSync('tmp/test-audio.wav', wavBuffer);
      console.log('Saved to tmp/test-audio.wav');
    } else {
      console.log('No inlineData found in response parts.');
    }

  } catch (error) {
    console.error('Error during TTS test:', error);
  }
}

testTTS();
