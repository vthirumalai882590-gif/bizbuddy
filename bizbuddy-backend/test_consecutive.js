const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = 'gemini-2.5-flash-lite';

async function runTest() {
  const messages = [
    { role: 'system', content: 'You are a helpful math tutor.' },
    { role: 'user', content: 'Hello!' }
  ];

  // Try mapping like original code
  const contents = messages.map(turn => ({
    role: turn.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: turn.content }]
  }));

  console.log('Sending contents:', JSON.stringify(contents, null, 2));

  try {
    const res = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: { systemInstruction: 'Always talk in pirate slang.' }
    });
    console.log('Success! Response:', res.text);
  } catch (error) {
    console.error('Error with original mapping:', error.message);
  }
}

runTest();
