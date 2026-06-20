const axios = require('axios');

async function verifyAll() {
  console.log('=== STARTING END-TO-END AI COACH & FEATURE VERIFICATION ===\n');
  const baseURL = 'http://localhost:5001';

  // 1. GET /api/expenses/ai-coach
  try {
    console.log('1. Verifying AI Coach Strategy Guide (GET /api/expenses/ai-coach)...');
    const res = await axios.get(`${baseURL}/api/expenses/ai-coach`);
    console.log(`   [SUCCESS] Status: ${res.status}, Success: ${res.data.success}`);
    console.log(`   Sample Output: "${res.data.advice.substring(0, 120)}..."\n`);
  } catch (err) {
    console.error('   [FAIL] AI Coach Strategy Guide error:', err.message);
  }

  // 2. POST /api/expenses/chat
  try {
    console.log('2. Verifying Investments Chatbot (POST /api/expenses/chat)...');
    const res = await axios.post(`${baseURL}/api/expenses/chat`, {
      message: 'Should I invest more in inventory restock or marketing?',
      context: 'Current revenue is ₹40,000, current expenses is ₹10,000.',
      history: []
    });
    console.log(`   [SUCCESS] Status: ${res.status}, Success: ${res.data.success}`);
    console.log(`   Sample Output: "${res.data.reply.substring(0, 120)}..."\n`);
  } catch (err) {
    console.error('   [FAIL] Investments Chatbot error:', err.message);
  }

  // 3. POST /api/ai/chat (general chat used by multiple pages)
  try {
    console.log('3. Verifying General AI Advisor Chat (POST /api/ai/chat)...');
    const res = await axios.post(`${baseURL}/api/ai/chat`, {
      messages: [
        { role: 'system', content: 'You are a business intelligence assistant.' },
        { role: 'user', content: 'Suggest three ways to reduce electricity bills in a small retail shop.' }
      ]
    });
    console.log(`   [SUCCESS] Status: ${res.status}, Success: ${res.data.success}`);
    console.log(`   Sample Output: "${res.data.data.content.substring(0, 120)}..."\n`);
  } catch (err) {
    console.error('   [FAIL] General AI Advisor Chat error:', err.message);
  }

  // 4. POST /api/ai/marketing (marketing options copy generator)
  try {
    console.log('4. Verifying Marketing Copy Generator (POST /api/ai/marketing)...');
    const res = await axios.post(`${baseURL}/api/ai/marketing`, {
      platform: 'instagram',
      festival: 'Diwali',
      prompt: 'Offer a 15% discount on Basmati Rice packages.'
    });
    console.log(`   [SUCCESS] Status: ${res.status}, Success: ${res.data.success}`);
    console.log(`   Sample Output Styles:`, res.data.data.versions.map(v => v.style));
    console.log(`   Sample Headline: "${res.data.data.versions[0]?.banner?.headline}"\n`);
  } catch (err) {
    console.error('   [FAIL] Marketing Copy Generator error:', err.message);
  }

  // 5. POST /api/website (custom website generator)
  try {
    console.log('5. Verifying Custom Website Blueprint Generator (POST /api/website)...');
    const res = await axios.post(`${baseURL}/api/website`, {
      businessName: 'Krishna Grocery Store',
      description: 'A friendly local grocery store in Indore specializing in organic spices and basmati rice.',
      theme: 'Vibrant',
      products: []
    });
    console.log(`   [SUCCESS] Status: ${res.status}, Success: ${res.data.success}`);
    console.log(`   Generated Brand Tagline: "${res.data.data.tagline}"`);
    console.log(`   Primary Theme Color: "${res.data.data.design?.primaryColor}"\n`);
  } catch (err) {
    console.error('   [FAIL] Custom Website Blueprint Generator error:', err.message);
  }

  console.log('=== VERIFICATION COMPLETED ===');
}

verifyAll();
