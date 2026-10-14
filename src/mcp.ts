// typescript/m1/m1.6_agent_mcp.ts
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { model as model } from './model';
import { createDeepAgent } from 'deepagents';

const client = new MultiServerMCPClient({
  'docs-langchain': {
    transport: 'http',
    url: 'https://docs.langchain.com/mcp',
  },
});

const tools = await client.getTools();

// for (const tool of tools) {
//   console.log(`name: ${tool.name}\n disc: ${tool.description.substring(0, 50)}`);
// }

const agent = createDeepAgent({ model, tools });

const res = await agent.invoke({
  messages: {
    role: 'human',
    content:
      'Use the LangChain docs MCP tool to explain what MCP is and how LangChain uses MCP tools.',
  },
});

console.log(res.messages.at(-1)?.content);
