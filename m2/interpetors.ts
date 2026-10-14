import { createDeepAgent } from 'deepagents';
import { model } from '../src/model';
import { createCodeInterpreterMiddleware } from '@langchain/quickjs';

const agent = createDeepAgent({
  model,
  middleware: [createCodeInterpreterMiddleware()],
});

const result = await agent.invoke({
  messages: [
    {
      role: 'user',
      content: 'Use the eval tool to compute and return the first 15 Fibonacci numbers.',
    },
  ],
});

console.log(result.messages.at(-1)?.text);
