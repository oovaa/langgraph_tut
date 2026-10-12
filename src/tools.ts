import { DatabaseSync } from 'node:sqlite';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { z } from 'zod';
import { tool } from 'langchain';
import { createDeepAgent } from 'deepagents';

import { llm as model } from './model';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'chinook.db');
const db = new DatabaseSync(DB_PATH);

const systemPrompt = `
You are a SQL analyst with access to the Chinook music store database.

Rules:
- Use read_sql for SELECT queries.
- Do not modify the database.
- If a tool returns an error, revise the SQL and try again.
- Show your SQL in your final answer.


### use as less tool calls as possible
`;

const readSql = ({ query }: { query: string }) => {
  try {
    console.log(`colling the tool with the query \n: ${query}`);

    return db.exec(query);
  } catch (error) {
    return `error :${error}`;
  }
};

const readSqlTool = tool(readSql, {
  name: 'read_sql',
  description: 'Run a read-only SELECT query against the Chinook music store database.',
  schema: z.object({
    query: z.string().describe('the query to run'),
  }),
});

const agent = createDeepAgent({
  model,
  tools: [readSqlTool],
  systemPrompt,
  name: 'SQL admin agent',
});

const result = await agent.invoke({
  messages: { role: 'user', content: 'Which five genres have the most tracks?' },
});

console.log(result);
