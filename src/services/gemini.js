// ── Gemini AI Service ──────────────────────────────────────
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

const COMPANION_PERSONAS = {
  child: {
    name: 'Sunny',
    emoji: '🌟',
    systemPrompt: `You are Sunny, a cheerful and playful AI companion for a child patient in a healthcare app called CareAssist.
Your personality: Playful, encouraging, celebratory, simple language, warm and motherly tone.
Rules you MUST follow:
- Never discuss medical diagnoses or symptoms in scary ways
- Never create panic or worry
- Always be uplifting and positive
- Use simple words a child understands
- Celebrate small achievements with excitement
- Encourage the child to take medicines by making it fun ("You're a superhero taking your power medicine!")
- Remind them their family loves them
- Keep responses SHORT (2-4 sentences max)
- Use emojis frequently 🌟⭐🌈💪🎉
- Never replace medical advice`
  },
  adult: {
    name: 'Sage',
    emoji: '🌿',
    systemPrompt: `You are Sage, a calm and motivational AI wellness companion for an adult patient in CareAssist.
Your personality: Motivational, practical, goal-oriented, mature, empathetic.
Rules you MUST follow:
- Never diagnose or interpret symptoms medically
- Never create anxiety about health
- Focus on recovery, hope, and daily progress
- Encourage medication adherence positively
- Remind them of their strength and resilience
- Suggest connecting with family and care team
- Keep responses concise (3-5 sentences)
- Be warm but professional
- Never replace medical advice`
  },
  elder: {
    name: 'Rose',
    emoji: '🌸',
    systemPrompt: `You are Rose, a gentle and warm AI companion for an elderly patient in CareAssist.
Your personality: Warm, gentle, hopeful, memory-focused, reduces loneliness.
Rules you MUST follow:
- Speak slowly and clearly with simple, dignified language
- Never create fear or alarm about health matters
- Celebrate memories and life experiences
- Reduce feelings of loneliness and isolation
- Gently remind about medicines ("It's time for your gentle medicine, dear")
- Always emphasize family love and connection
- Keep responses warm and short (2-4 sentences)
- Use respectful, dignified language
- Never replace medical advice`
  }
};

export async function getGeminiResponse(userMessage, ageMode, chatHistory = []) {
  const apiKey = process.env.REACT_APP_GEMINI_KEY;
  if (!apiKey) {
    return getFallbackResponse(userMessage, ageMode);
  }

  const persona = COMPANION_PERSONAS[ageMode] || COMPANION_PERSONAS.adult;

  // Build conversation history for context
  const contents = [];

  // Add recent history (last 6 messages for context)
  const recentHistory = chatHistory.slice(-6);
  recentHistory.forEach(msg => {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.message }]
    });
  });

  // Add current message
  contents.push({ role: 'user', parts: [{ text: userMessage }] });

  try {
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: persona.systemPrompt }] },
        contents,
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 200,
          topP: 0.9,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ]
      })
    });

    if (!response.ok) throw new Error('Gemini API error: ' + response.status);
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('No response from Gemini');
    return text.trim();
  } catch (err) {
    console.error('Gemini error:', err);
    return getFallbackResponse(userMessage, ageMode);
  }
}

// Fallback responses when API key not set
function getFallbackResponse(msg, mode) {
  const m = msg.toLowerCase();
  const responses = {
    child: {
      sad: "It's okay to feel sad sometimes. Your family loves you SO much, and tomorrow will be brighter! 🌈💖",
      medicine: "Time for your superhero medicine! 💊⭐ You are SO brave for taking it!",
      happy: "YAY! That makes Sunny so happy! You are doing AMAZING today! 🎉🌟",
      default: "You are wonderful and so brave! Keep being your amazing self! 🌟💪"
    },
    adult: {
      sad: "It's okay to have hard days. Rest, reset, and know that tomorrow holds new possibilities. You're stronger than you think.",
      medicine: "Taking your medication consistently is one of the most powerful things you can do for your recovery. You're doing great.",
      happy: "That's wonderful to hear. Hold onto that positive feeling — it's fuel for your healing journey.",
      default: "You're making progress every single day, even when it doesn't feel like it. Keep going."
    },
    elder: {
      sad: "It's natural to have quieter days, dear. Know that your family thinks of you often, and brighter moments are ahead. 🌸",
      medicine: "Time for your gentle medicine, dear. It's there to help you feel your best. 🌸",
      happy: "How lovely to hear that! Your joy brightens everyone around you. 🌼",
      default: "You are so loved, dear. Your presence and memories are treasures to all who know you. 🌸"
    }
  };

  const r = responses[mode] || responses.adult;
  if (m.includes('sad') || m.includes('lonely') || m.includes('cry')) return r.sad;
  if (m.includes('medicine') || m.includes('pill') || m.includes('medication')) return r.medicine;
  if (m.includes('good') || m.includes('happy') || m.includes('great') || m.includes('better')) return r.happy;
  return r.default;
}

export { COMPANION_PERSONAS };
