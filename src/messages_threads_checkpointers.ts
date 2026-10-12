import { createDeepAgent } from 'deepagents';
import { llm } from './model';
import { MemorySaver } from '@langchain/langgraph';

const agent = createDeepAgent({
  model: llm,
  checkpointer: new MemorySaver(),
});

const threadA = { configurable: { thread_id: 'm1-7-thread-a' } };
const threadB = { configurable: { thread_id: 'm1-7-thread-b' } };

const result = await agent.invoke(
  {
    messages: { role: 'human', content: "remember my brohter's name is Ali" },
  },
  threadA,
);
console.log(result.messages.at(-1)?.content);

const result2 = await agent.invoke(
  {
    messages: { role: 'human', content: "what is my brother's name" },
  },
  threadB, // it wont be able to get it. not the same thread
);
console.log(result2.messages.at(-1)?.content);
