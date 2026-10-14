import { randomUUID } from 'node:crypto';

import { context } from 'langchain';
import { LangSmithSandbox, LocalShellBackend, createDeepAgent } from 'deepagents';
import { SandboxClient } from 'langsmith/sandbox';

import { model } from '../src/model.ts';

const backend = new LocalShellBackend({
  rootDir: './workspace',
  virtualMode: true,
  inheritEnv: true,
});

await backend.initialize();

const agent = createDeepAgent({
  model,
  backend,
  systemPrompt: context`
    You are a coding assistant. When asked to run code, write the script
    to a file first, then execute it. Show the output in your final answer.`,
});

try {
  const result = await agent.invoke({
    messages: [
      {
        role: 'user',
        content: context`
          Write a Python script that prints the first 15 Fibonacci numbers,
          save it to fib.py, and run it.`,
      },
    ],
  });
  console.log(result.messages.at(-1)?.text);
} catch (er) {
  console.log(er);
}
