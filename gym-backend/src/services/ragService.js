const fs = require('fs');
const pdfjs = require('pdfjs-dist/legacy/build/pdf');
const voyageai = require('voyageai');

const VoyageAIClient = voyageai.VoyageAIClient;

const client = new VoyageAIClient({
  apiKey: process.env.VOYAGE_API_KEY
});

console.log('✅ RAG Service initialized — pdfjs-dist loaded successfully');

// ⏱️ Rate limiting configuration
const RATE_LIMIT = {
  RPM: 3, // Requests per minute (free tier)
  TPM: 10000, // Tokens per minute (free tier)
  DELAY_MS: 22000, // 22 seconds between requests (3 RPM = 1 request per 20 seconds, use 22 for safety)
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 5000 // Start with 5s, exponential backoff
};

// Track last request time for throttling
let lastRequestTime = 0;

// 🕐 Sleep utility
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 🚦 Throttle requests to respect rate limits (BEFORE making request)
const throttleRequest = async () => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < RATE_LIMIT.DELAY_MS) {
    const waitTime = RATE_LIMIT.DELAY_MS - timeSinceLastRequest;
    console.log(`🚦 Rate limit throttle: waiting ${(waitTime / 1000).toFixed(1)}s until next request...`);
    await sleep(waitTime);
  }
  
  lastRequestTime = Date.now();
};

// 🔄 Retry with exponential backoff
const retryWithBackoff = async (fn, maxRetries = RATE_LIMIT.MAX_RETRIES) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Throttle before making request
      await throttleRequest();
      return await fn();
    } catch (error) {
      // Check if it's a rate limit error (429)
      if (error.response?.status === 429 && attempt < maxRetries) {
        const delayMs = RATE_LIMIT.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(`⏳ Rate limited! Waiting ${(delayMs / 1000).toFixed(1)}s before retry ${attempt}/${maxRetries}...`);
        await sleep(delayMs);
        continue;
      }
      throw error;
    }
  }
};

// 📄 Extract text from PDF buffer
const extractPdfText = async (dataBuffer) => {
  try {
    // ✅ Convert Buffer to Uint8Array (pdfjs-dist requirement)
    const uint8Array = new Uint8Array(dataBuffer);
    
    const pdf = await pdfjs.getDocument({ data: uint8Array }).promise;
    let fullText = '';

    // Extract text from all pages (limit to 500 pages)
    const numPages = Math.min(pdf.numPages, 500);
    console.log(`📄 PDF has ${numPages} pages`);
    
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str || '').join(' ');
        fullText += pageText + '\n';
      } catch (pageError) {
        console.warn(`⚠️  Could not extract text from page ${pageNum}:`, pageError.message);
        continue;
      }
    }

    return fullText;
  } catch (error) {
    throw new Error(`PDF text extraction failed: ${error.message}`);
  }
};

// 📄 PDF → chunks (filePath OR buffer dono support)
const pdfToChunks = async (input, chunkSize = 300) => {
  try {
    let dataBuffer;

    // 👉 Agar multer buffer hai
    if (Buffer.isBuffer(input)) {
      dataBuffer = input;
    } 
    // 👉 Agar file path hai
    else if (typeof input === 'string') {
      if (!fs.existsSync(input)) {
        throw new Error(`PDF file not found: ${input}`);
      }
      dataBuffer = fs.readFileSync(input);
    } else {
      throw new Error(`Invalid input: expected Buffer or file path string`);
    }

    // Validate buffer
    if (!dataBuffer || dataBuffer.length === 0) {
      throw new Error('PDF buffer is empty');
    }

    console.log(`📥 Processing PDF (${(dataBuffer.length / 1024).toFixed(2)} KB)`);

    // ✅ Extract text using pdfjs-dist
    const text = await extractPdfText(dataBuffer);

    if (!text) {
      throw new Error("PDF has no readable text content");
    }

    const trimmedText = text.trim();
    
    if (trimmedText.length === 0) {
      throw new Error("PDF has no readable text content");
    }

    console.log(`📖 Extracted ${trimmedText.length} characters`);

    // 👉 Words split — better regex
    const words = trimmedText.replace(/\n+/g, ' ').split(/\s+/).filter(w => w.length > 0);
    
    if (words.length === 0) {
      throw new Error("No words found in PDF");
    }

    const chunks = [];

    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(' ').trim();

      if (chunk.length > 0) {
        chunks.push(chunk);
      }
    }

    console.log(`✅ PDF split into ${chunks.length} chunks (avg ${Math.round(words.length / chunks.length)} words/chunk)`);
    return chunks;

  } catch (error) {
    console.error("❌ PDF parsing error:", error.message);
    throw new Error(`PDF processing failed: ${error.message}`);
  }
};


// 🧠 Multiple embeddings (batch processing with rate limiting)
const getEmbeddings = async (texts) => {
  try {
    if (!Array.isArray(texts) || texts.length === 0) {
      throw new Error('Invalid input: expected non-empty array of texts');
    }

    // Validate each text
    const validTexts = texts.filter(t => typeof t === 'string' && t.trim().length > 0);
    
    if (validTexts.length === 0) {
      throw new Error('No valid text to embed');
    }

    console.log(`🔄 Generating embeddings for ${validTexts.length} chunks...`);

    // Call with retry and rate limiting (throttle happens inside retryWithBackoff)
    const response = await retryWithBackoff(async () => {
      console.log(`📤 Sending request to Voyage AI...`);
      const result = await client.embed({
        input: validTexts,
        model: 'voyage-2'
      });
      return result;
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('Empty embedding response from Voyage AI');
    }

    console.log(`✅ Generated ${response.data.length} embeddings`);
    
    return response.data.map((item) => item.embedding);

  } catch (error) {
    console.error("❌ Embedding error:", error.message);
    throw new Error(`Embedding generation failed: ${error.message}`);
  }
};


// 🧠 Single embedding (with rate limiting)
const getEmbedding = async (text) => {
  try {
    if (typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Invalid input: expected non-empty string');
    }

    const response = await retryWithBackoff(async () => {
      return await client.embed({
        input: [text.trim()],
        model: 'voyage-2'
      });
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('Empty embedding response');
    }

    return response.data[0].embedding;

  } catch (error) {
    console.error("❌ Single embedding error:", error.message);
    throw new Error(`Single embedding failed: ${error.message}`);
  }
};


// 📊 Cosine similarity (vector distance)
const cosineSimilarity = (vecA, vecB) => {
  try {
    if (!Array.isArray(vecA) || !Array.isArray(vecB)) {
      return 0;
    }

    if (vecA.length === 0 || vecB.length === 0) {
      return 0;
    }

    const dotProduct = vecA.reduce((sum, a, i) => sum + a * (vecB[i] || 0), 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    return dotProduct / (magnitudeA * magnitudeB);

  } catch (error) {
    console.error("❌ Similarity calculation error:", error.message);
    return 0;
  }
};


// 🔍 Find relevant chunks (RAG retrieval)
const findRelevantChunks = async (question, chunksWithEmbeddings, topK = 3) => {
  try {
    if (typeof question !== 'string' || question.trim().length === 0) {
      throw new Error('Invalid question: expected non-empty string');
    }

    if (!Array.isArray(chunksWithEmbeddings) || chunksWithEmbeddings.length === 0) {
      throw new Error('Invalid chunks: expected non-empty array');
    }

    // Validate topK
    topK = Math.min(topK, chunksWithEmbeddings.length);

    console.log(`🔍 Searching in ${chunksWithEmbeddings.length} chunks for: "${question.substring(0, 50)}..."`);

    const questionEmbedding = await getEmbedding(question);

    const scored = chunksWithEmbeddings.map((item) => ({
      chunk: item.chunk,
      score: cosineSimilarity(questionEmbedding, item.embedding)
    }));

    // Sort by relevance (descending)
    scored.sort((a, b) => b.score - a.score);

    const result = scored.slice(0, topK);

    // Log scores for debugging
    result.forEach((r, i) => {
      console.log(`  ${i + 1}. Score: ${(r.score * 100).toFixed(1)}% — ${r.chunk.substring(0, 60)}...`);
    });

    console.log(`✅ Found top ${topK} relevant chunks (avg score: ${(result.reduce((sum, r) => sum + r.score, 0) / topK * 100).toFixed(1)}%)`);
    
    return result.map((item) => item.chunk);

  } catch (error) {
    console.error("❌ RAG search error:", error.message);
    throw new Error(`RAG search failed: ${error.message}`);
  }
};


module.exports = {
  pdfToChunks,
  getEmbeddings,
  getEmbedding,
  findRelevantChunks
};