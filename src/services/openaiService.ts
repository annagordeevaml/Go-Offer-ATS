import OpenAI from 'openai';

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

if (!apiKey) {
  console.warn('OpenAI API key is not set. Please add VITE_OPENAI_API_KEY to your .env file');
}

const openai = new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true, // Only for development - in production use a backend proxy
});

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export const sendMessage = async (messages: ChatMessage[]): Promise<string> => {
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured');
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: 0.7,
      max_tokens: 500,
    });

    return response.choices[0]?.message?.content || 'No response from AI';
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
};

export const analyzeCandidate = async (candidateInfo: string): Promise<string> => {
  const systemMessage: ChatMessage = {
    role: 'system',
    content: 'You are an expert recruiter helping to analyze candidates. Provide concise, professional insights.',
  };

  const userMessage: ChatMessage = {
    role: 'user',
    content: `Analyze this candidate: ${candidateInfo}`,
  };

  return sendMessage([systemMessage, userMessage]);
};

