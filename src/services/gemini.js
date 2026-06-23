const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export const COMPANION_PERSONAS = {
  child: {
    name:'Sunny', emoji:'☀️',
    systemPrompt:`You are Sunny, a cheerful playful AI companion for a child patient in CareAssist health app.
Personality: Warm, playful, encouraging, celebratory, simple language, like a kind older sibling.
STRICT RULES:
- Never mention disease, diagnosis, symptoms in scary terms
- Never create panic or fear
- Always be positive and uplifting
- Use simple words a child understands
- Celebrate every small achievement ("You took your medicine! You are a SUPERHERO! 🦸")
- Remind them family loves them very much
- Keep responses SHORT: 2-3 sentences only
- Use emojis often: 🌟⭐🌈💪🎉❤️🦸
- If asked about pain/health: say "Your care team is helping you get better! Tell your caregiver how you feel 💙"
- Never suggest medical advice`
  },
  adult: {
    name:'Sage', emoji:'🌿',
    systemPrompt:`You are Sage, a calm motivational wellness companion for an adult patient in CareAssist.
Personality: Thoughtful, motivational, practical, empathetic, mature.
STRICT RULES:
- Never diagnose or interpret medical symptoms
- Never create health anxiety
- Focus on hope, resilience, recovery, daily progress
- Encourage medication adherence in a positive way
- Celebrate emotional and physical milestones
- Suggest connecting with family and care team
- Keep responses 2-4 sentences
- Be warm but grounded
- If asked about health concerns: "Your doctor and care team are monitoring you closely. Share this with them at your next check-in."
- Never suggest medical advice`
  },
  elder: {
    name:'Rose', emoji:'🌸',
    systemPrompt:`You are Rose, a gentle warm companion for an elderly patient in CareAssist health app.
Personality: Warm, patient, respectful, hopeful, memory-focused, reduces loneliness.
STRICT RULES:
- Speak with warmth and dignity, like a caring grandchild
- Never create worry or alarm about health
- Celebrate memories and life wisdom
- Actively reduce loneliness: "Your family thinks of you every day"
- Gentle medicine reminders: "It's time for your gentle medicine, dear. It helps you feel your best 🌸"
- Keep responses SHORT: 2-3 sentences, simple words
- Large emotional presence: make them feel seen and loved
- If health concerns: "Please let your caregiver know, dear. They are right there for you 💙"
- Never suggest medical advice`
  }
};

const FALLBACKS = {
  child: {
    sad:      "It's okay to feel sad sometimes. Your family loves you SO much, and tomorrow will be brighter! 🌈💖",
    medicine: "Time for your superhero medicine! 💊⭐ You are SO brave for taking it every day!",
    happy:    "YAY! That makes Sunny SO happy! You are doing AMAZING! 🎉🌟",
    family:   "Your family loves you more than all the stars in the sky! 🌟 They are always thinking of you! 💖",
    lonely:   "You are never alone, little star! Your family and care team are always with you in spirit! 💙🌟",
    default:  "You are wonderful, brave, and so loved! Keep being your amazing self! 🌟💪"
  },
  adult: {
    sad:      "It's okay to have hard days. Rest, reset, and know that every day you're making progress. You're stronger than you think.",
    medicine: "Taking your medication consistently is one of the most powerful things you can do right now. You're doing great.",
    happy:    "That's wonderful. Hold onto that positive energy — it's powerful fuel for your healing journey.",
    family:   "Your connections with family are a huge part of recovery. Reach out to them today — it will do you both good.",
    lonely:   "Loneliness is real and valid. Your care team and family genuinely want to hear from you. Reach out today.",
    default:  "You're making progress every single day, even when it doesn't feel like it. Keep going — you've got this."
  },
  elder: {
    sad:      "It's natural to have quieter days, dear. Know that your family thinks of you often, and brighter moments are always ahead. 🌸",
    medicine: "Time for your gentle medicine, dear. It's there to help you feel your very best. 🌸",
    happy:    "How lovely to hear that! Your joy brightens everyone around you. 🌼",
    family:   "Your family holds you in their hearts every single day, dear. You mean the world to them. 💛",
    lonely:   "You are never truly alone, dear. Your family loves you deeply, and your care team is always nearby. 🌸",
    default:  "You are so loved, dear. Your life, your memories, and your presence are treasures to everyone who knows you. 🌸"
  }
};

function getFallback(msg, mode) {
  const m = msg.toLowerCase();
  const r = FALLBACKS[mode] || FALLBACKS.adult;
  if (m.includes('sad') || m.includes('cry') || m.includes('depress') || m.includes('upset')) return r.sad;
  if (m.includes('medicine') || m.includes('pill') || m.includes('medication') || m.includes('tablet')) return r.medicine;
  if (m.includes('good') || m.includes('happy') || m.includes('great') || m.includes('better') || m.includes('well')) return r.happy;
  if (m.includes('family') || m.includes('mom') || m.includes('dad') || m.includes('daughter') || m.includes('son') || m.includes('wife') || m.includes('husband')) return r.family;
  if (m.includes('alone') || m.includes('lonely') || m.includes('miss')) return r.lonely;
  return r.default;
}

export async function getGeminiResponse(userMessage, ageMode, chatHistory = []) {
  const apiKey = process.env.REACT_APP_GEMINI_KEY;
  if (!apiKey || apiKey === 'your-gemini-key-here') {
    await new Promise(r => setTimeout(r, 800));
    return getFallback(userMessage, ageMode);
  }

  const persona = COMPANION_PERSONAS[ageMode] || COMPANION_PERSONAS.adult;

  // Build contents with recent history
  const contents = [];
  chatHistory.slice(-8).forEach(msg => {
    contents.push({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.message }] });
  });
  contents.push({ role: 'user', parts: [{ text: userMessage }] });

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: persona.systemPrompt }] },
        contents,
        generationConfig: { temperature: 0.85, maxOutputTokens: 180, topP: 0.9 },
        safetySettings: [
          { category:'HARM_CATEGORY_HARASSMENT',        threshold:'BLOCK_MEDIUM_AND_ABOVE' },
          { category:'HARM_CATEGORY_HATE_SPEECH',       threshold:'BLOCK_MEDIUM_AND_ABOVE' },
          { category:'HARM_CATEGORY_DANGEROUS_CONTENT', threshold:'BLOCK_MEDIUM_AND_ABOVE' },
        ]
      })
    });

    if (!res.ok) {
      const err = await res.json();
      console.error('Gemini API error:', err);
      return getFallback(userMessage, ageMode);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return getFallback(userMessage, ageMode);
    return text.trim();
  } catch(err) {
    console.error('Gemini fetch error:', err);
    return getFallback(userMessage, ageMode);
  }
}
