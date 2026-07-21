const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const modelsToTest = [
  'gemini-3.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-3.1-flash-lite'
];

async function testAll() {
  for (const model of modelsToTest) {
    console.log(`Testing model: ${model}...`);
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: 'Hello, respond with a short message.',
      });
      console.log(`  Success with ${model}! Response:`, response.text.trim());
    } catch (error) {
      console.error(`  Error with ${model}:`, error.message);
    }
  }
}

testAll();
