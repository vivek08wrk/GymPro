const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// 🌍 Detect language (Hindi vs English)
const detectLanguage = (text) => {
  // Hindi script Unicode ranges: Devanagari (0x0900-0x097F)
  const hindiRegex = /[\u0900-\u097F]/g;
  const hindiChars = (text.match(hindiRegex) || []).length;
  const totalChars = text.trim().length;
  
  // If more than 30% Hindi characters, it's Hindi
  return hindiChars > totalChars * 0.3 ? 'hindi' : 'english';
};

// 🔄 Available models (in priority order)
const AVAILABLE_MODELS = [
  'llama-3.3-70b-versatile',  // Latest Llama 3.3
  'llama-3.1-70b-versatile',  // Fallback
  'llama-3.2-90b-vision-preview',
  'mixtral-8x7b-32768',       // Older fallback
  'gemma2-9b-it',             // Another fallback
  'llama2-70b-4096'           // Last resort
];

// 🧠 Try model with fallbacks
const callGroqWithFallback = async (messages, maxTokens = 500) => {
  for (const model of AVAILABLE_MODELS) {
    try {
      console.log(`🤖 Trying model: ${model}`);
      const completion = await groq.chat.completions.create({
        model,
        messages,
        max_tokens: maxTokens
      });
      console.log(`✅ Success with model: ${model}`);
      return completion.choices[0].message.content;
    } catch (error) {
      const isDecommissioned = error.message?.includes('decommissioned') || 
                               error.message?.includes('404');
      const isRateLimit = error.response?.status === 429;
      
      if (isDecommissioned) {
        console.warn(`⚠️  Model '${model}' decommissioned, trying next...`);
        continue;
      } else if (isRateLimit) {
        console.error(`❌ Rate limit on model '${model}'`);
        throw new Error('Groq API rate limited. Please try again in a few moments.');
      } else {
        // Unknown error, try next model
        console.warn(`⚠️  Model '${model}' failed:`, error.message);
        continue;
      }
    }
  }
  
  // All models failed
  throw new Error(
    `❌ All Groq models are unavailable/decommissioned. ` +
    `Please check: https://console.groq.com/docs/deprecations ` +
    `Available models: ${AVAILABLE_MODELS.join(', ')}`
  );
};

// RAG ke liye — context ke saath jawab do
const askWithContext = async (question, contextChunks) => {
  const context = contextChunks.join('\n\n');
  const language = detectLanguage(question);

  // Language-specific system prompt
  const systemPrompt = language === 'hindi'
    ? `Tum ek gym assistant ho. Sirf Hindi me jawab do. English bilkul use mat karo.
    Provided documents se jawab do. Keep answers concise aur practical.
    Ager answer documents mein nahi hai to honestly kaho.
    Hindi ya Hinglish mein bolo, bas English mat use karo.`
    : `You are a helpful gym assistant. Reply ONLY in English. Do NOT use any Hindi words.
    Answer questions based on the provided gym documents.
    Keep answers concise and practical. If the answer is not in the context, say so honestly.`;

  const messages = [
    {
      role: 'system',
      content: systemPrompt
    },
    {
      role: 'user',
      content: `Context from gym documents:\n${context}\n\nQuestion: ${question}`
    }
  ];

  return await callGroqWithFallback(messages, 500);
};

// Admin insights ke liye — gym data ke baare mein
const askAdminInsight = async (question, gymData) => {
  const language = detectLanguage(question);

  // Language-specific system prompt
  const systemPrompt = language === 'hindi'
    ? `Tum ek gym manager assistant ho. Gym members ke baare mein natural, conversational way mein jawab do. SIRF HINDI ME JAWAB DO.

    STRICT RULES:
    - Kabhi technical terms use mat karo: "isActive", "expiryDate", "field", "boolean", "object"
    - Raw data ya JSON kabhi show mat karo
    - Gym manager ki tarah bolo
    - Short jawab: 2-3 lines max
    - Membership active hai to bas "active hai" ya "active" kaho
    - Dates ko naturally bolo: "5 May 2026 tak active hai"

    EXAMPLE:
    Q: "Vivek ki membership kaisi hai?"
    A: "Vivek Singh ki membership active hai aur 5 May 2026 tak valid hai."`
    : `You are a friendly gym manager assistant. Answer questions about gym members in a natural, conversational way. REPLY ONLY IN ENGLISH.

    STRICT RULES:
    - Never use technical terms like "isActive", "expiryDate", "field", "boolean", "object"
    - Never show raw data or JSON
    - Talk like a human gym manager would talk
    - Keep answers short and to the point — 2-3 lines max
    - If membership is active, just say "is active" or "active"
    - For dates, say it naturally like "active until May 5, 2026"

    EXAMPLE:
    Q: "What is Vivek's membership status?"
    A: "Vivek Singh's membership is active and valid until May 5, 2026."`

  const messages = [
    {
      role: 'system',
      content: systemPrompt
    },
    {
      role: 'user',
      content: `Gym Data:\n${JSON.stringify(gymData, null, 2)}\n\nQuestion: ${question}`
    }
  ];

  return await callGroqWithFallback(messages, 500);
};
// Motivational message banao — member progress se
const generateMotivationalMessage = async (member, progressHistory) => {
  const messages = [
    {
      role: 'system',
      content: `You are a motivational gym coach. Generate a short, personal WhatsApp message 
      to motivate an inactive gym member based on their past progress. 
      Keep it under 100 words, warm and encouraging. Write in Hindi or English based on the name.`
    },
    {
      role: 'user',
      content: `Member: ${member.name}
      Phone: ${member.phone}
      Progress History: ${JSON.stringify(progressHistory, null, 2)}
      
      Generate a motivational WhatsApp message highlighting their best achievements.`
    }
  ];

  return await callGroqWithFallback(messages, 200);
};

// Attendance query — analyze attendance patterns
const queryAttendanceData = async (question, attendanceData) => {
  const messages = [
    {
      role: 'system',
      content: `You are a gym admin assistant analyzing attendance data. Answer questions about member attendance patterns.
      
      INSTRUCTIONS:
      - Analyze attendance records to identify presence/absence patterns
      - Calculate percentages and trends naturally
      - Highlight consecutive absences or perfect attendance
      - Keep responses practical and actionable
      - Format dates naturally (e.g., "last week", "7 May 2026")
      - Never show raw data, summarize insights instead`
    },
    {
      role: 'user',
      content: `Attendance Data:\n${JSON.stringify(attendanceData, null, 2)}\n\nQuestion: ${question}`
    }
  ];

  return await callGroqWithFallback(messages, 500);
};

module.exports = { askWithContext, askAdminInsight, generateMotivationalMessage, queryAttendanceData };