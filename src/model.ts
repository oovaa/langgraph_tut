import { ChatGroq } from '@langchain/groq';
import { initChatModel } from 'langchain';
import { ChatOpenAI } from '@langchain/openai';

export const llm = new ChatOpenAI({
  model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
  apiKey: process.env.OPENROUTER_API_KEY,
  configuration: {
    baseURL: 'https://openrouter.ai/api/v1',
  },
  temperature: 0,
});

const res = await llm.invoke('hi');

console.log(res.content);
