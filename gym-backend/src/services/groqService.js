const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

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

  const messages = [
    {
      role: 'system',
      content: `You are a helpful gym assistant. Answer questions based on the provided gym documents. 
      Keep answers concise and practical. If the answer is not in the context, say so honestly.`
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
  const messages = [
    {
      role: 'system',
      content: `You are a friendly gym manager assistant. Answer questions about gym members in a natural, conversational way.

      STRICT RULES:
      - Never use technical terms like "isActive", "expiryDate", "field", "boolean", "object"
      - Never show raw data or JSON
      - Talk like a human gym manager would talk
      - Keep answers short and to the point — 2-3 lines max
      - If membership is active, just say "active hai" or "active"
      - For dates, say it naturally like "5 May 2026 tak active hai"
      - Match the language of the question exactly — English to English, Hindi to Hindi

      GOOD EXAMPLE:
      Q: "What is the status of Vivek?"
      A: "Vivek Singh ki membership active hai aur 5 May 2026 tak valid hai."

      BAD EXAMPLE:
      A: "Vivek Singh ka isActive field true hai aur expiryDate 2026-05-05 hai."`
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