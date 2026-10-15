import { Database } from 'bun:sqlite';
import { createDeepAgent } from 'deepagents';
import { context, todoListMiddleware, tool } from 'langchain';
import z, { string } from 'zod';
import { model } from '../src/model';
import { MemorySaver } from '@langchain/langgraph';

const db = new Database('/home/omar/langgraph_tut/src/chinook.db');

const runSqliteQuery = tool(
  async ({ query }) => {
    const trimmed = query.trim();

    // Allow SELECT, WITH (for CTEs), PRAGMA, and EXPLAIN
    if (!/^(SELECT|WITH|PRAGMA|EXPLAIN)\b/i.test(trimmed)) {
      return 'Error: Only read-only queries (SELECT, WITH, PRAGMA, EXPLAIN) are permitted.';
    }

    try {
      // db.query() in bun:sqlite automatically compiles only a single statement
      // and combined with { readonly: true }, guarantees no data modification.
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
  checkpointer: new MemorySaver(),
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
});

const thread = { configurable: { thread_id: 'main' } };

async function main() {
  const run1 = await agnet.invoke(
    {
      messages: { role: 'human', content: 'hey there how is everything' },
    },
    thread,
  );

  console.log(run1);

  const run2 = await agnet.invoke(
    {
      messages: {
        role: 'human',
        content:
          'what are the best salles in terms of contries rank them please get me a report, and who are our best costumers',
      },
    },
    thread,
  );

  console.log(run2);

  const run3 = await agnet.invoke(
    {
      messages: {
        role: 'human',
        content: 'good and what are our best selling alboms ?',
      },
    },
    thread,
  );

  console.log(run3);
}

main();
