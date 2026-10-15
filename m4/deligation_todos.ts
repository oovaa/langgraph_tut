import { Database } from 'bun:sqlite';
import { createDeepAgent } from 'deepagents';
import { context, todoListMiddleware, tool } from 'langchain';
import z from 'zod';
import { model } from '../src/model';
import { MemorySaver } from '@langchain/langgraph';

const db = new Database('/home/omar/langgraph_tut/src/chinook.db');

const runSqliteQuery = tool(
  async ({ query }) => {
    const trimmed = query.trim();
    if (!/^(SELECT|WITH|PRAGMA|EXPLAIN)\b/i.test(trimmed)) {
      return 'Error: Only read-only queries (SELECT, WITH, PRAGMA, EXPLAIN) are permitted.';
    }
    try {
      const results = db.query(trimmed).all();
      console.log(`qeury: ${trimmed}`);
      const MAX_ROWS = 50;
      if (results.length > MAX_ROWS) {
        return JSON.stringify(
          {
            warning: `Query returned ${results.length} rows. Showing first ${MAX_ROWS}. Use LIMIT or aggregations.`,
            data: results.slice(0, MAX_ROWS),
          },
          null,
          2,
        );
      }
      return JSON.stringify(results, null, 2);
    } catch (error) {
      return `SQL Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  {
    name: 'run_sqlite_query',
    description:
      'Execute any read-only SQLite query (supports SELECT, DISTINCT, JOIN, LIKE, GROUP BY, WITH/CTEs, LIMIT, PRAGMA) against the Chinook database.',
    schema: z.object({
      query: z.string().describe('The complete SQL query string to execute'),
    }),
  },
);

const agnet = createDeepAgent({
  model,
  systemPrompt: context`you are an adminstrative assistant that gives helpful instights breaifly. you also can create a technical sub agent to do the technical tasks or answer data related questions as it has access to our database`,
  subagents: [
    {
      name: 'technical_lead_subagent',
      systemPrompt: context`you are a technical lead sub agent that has access to a database access tool you can only query as readonly and not modify the database and report the findings in a stuctured orgnized way.
Always use a todo list of what you want to do.
        `,
      description: 'a sub agent for technical tasks that has readonly access to the database',
      tools: [runSqliteQuery],
      middleware: [todoListMiddleware()],
    },
  ],
  checkpointer: new MemorySaver(),
});

const thread = { configurable: { thread_id: 'main' } };

function showTodos(label: string, todos: any) {
  if (!todos?.length) return;
  console.log(`\n=== ${label} todo list ===`);
  for (const t of todos) console.log(`[${t.status}] ${t.content}`);
}

// Log write_todos calls live, including from subagents
async function runAndShow(content: string) {
  const stream = await agnet.stream({ messages: { role: 'human', content } }, {
    ...thread,
    streamMode: 'updates',
    subagents: true,
  } as any);
  for await (const chunk of stream as any) {
    for (const [node, update] of Object.entries(chunk as any)) {
      const u: any = update;
      const todos = u?.todos ?? u?.agent?.todos;
      if (todos) showTodos(String(node), todos);
      const msgs = u?.messages;
      const list = Array.isArray(msgs) ? msgs : msgs ? [msgs] : [];
      for (const m of list) {
        for (const tc of m?.tool_calls ?? []) {
          if (tc.name === 'write_todos') showTodos(`live:${String(node)}`, tc.args?.todos);
        }
      }
    }
  }
  const finalState: any = await agnet.getState(thread as any);
  showTodos('final main-agent', finalState.values?.todos);
  const last = finalState.values?.messages?.at(-1);
  console.log('\n--- answer ---\n' + (last?.content ?? last));
}

async function main() {
  await runAndShow('hey there how is everything');
  await runAndShow(
    'what are the best salles in terms of contries rank them please get me a report, and who are our best costumers',
  );
  await runAndShow('good and what are our best selling alboms ?');
}

main();
