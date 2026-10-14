// typescript/m2/m2.4_homework.ts
/**
 * M2.4 Homework: Ask Your Own Question, Then Grade It.
 *
 * THE IDEA
 * Lab 2 asked one fixed, dependent-query question about the Chinook
 * database and let the interpreter chain four SQL queries together inside
 * a single eval() call. This homework asks you to pose your OWN question
 * about the database (anything queryChinook and a little JavaScript can
 * answer, simple or dependent, your call), and then, since this lesson is
 * also about evaluating what an agent's code produces, write your own quick
 * eval check that judges whether the agent's answer looks right. There's no
 * single right question or eval method here, that's the point.
 *
 * WHAT YOU FILL IN
 *   TODO 1: write your own natural-language question about the Chinook
 *     database (see the schema hints in SYSTEM below) for the interpreter
 *     agent to answer using eval() and queryChinook.
 *   TODO 2: write a small evalAnswer(...) function that independently
 *     checks whether the agent's final answer looks correct. However you
 *     want to do this is fine: run your own SQL query and compare, check
 *     for an expected keyword or number, or just print both side by side
 *     for your own judgment call. Pick whatever level of rigor makes sense
 *     for your question.
 *
 * RUN
 *   cd typescript
 *   pnpm tsx ./m2/m2.4_homework.ts
 */

import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { createCodeInterpreterMiddleware } from '@langchain/quickjs';
import { createDeepAgent } from 'deepagents';
import { context, tool } from 'langchain';
import { z } from 'zod';

import { model } from '../src/model.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPatt = join(__dirname, '../chinook.db');

const SYSTEM = context`
  You are a sales analyst for Chinook Digital Music Store.
  Use the query_chinook tool to query the database.
  Key tables: Artist(ArtistId, Name), Album(AlbumId, Title, ArtistId),
  Track(TrackId, Name, AlbumId, GenreId), Genre(GenreId, Name),
  Customer(CustomerId, FirstName, LastName, Country),
  Invoice(InvoiceId, CustomerId),
  InvoiceLine(InvoiceLineId, InvoiceId, TrackId, UnitPrice, Quantity).
  Revenue is InvoiceLine.UnitPrice * InvoiceLine.Quantity.
  The eval tool supports Programmatic Tool Calling (PTC): JavaScript
  running inside eval() can call query_chinook via tools.queryChinook().`;

const queryChinook = tool(
  ({ sql }) => {
    const db = new DatabaseSync(dbPatt);
    try {
      console.log(`sql :${sql}`);

      const rows = db.prepare(sql).all();
      return JSON.stringify(rows);
    } finally {
      db.close();
    }
  },
  {
    name: 'query_chinook',
    description:
      'Execute a read-only SQL query against the Chinook database. Returns a JSON-encoded string.',
    schema: z.object({ sql: z.string() }),
  },
);

// ════════════════════════════════════════════════════════════════════════
// TODO 1: Write your own question about the Chinook database.
//
// Pick anything the queryChinook tool can answer: top customers by
// country, which artist has the most albums, average invoice total by
// year, whatever you're curious about. A question with a couple of
// dependent steps (like Lab 2's) is a good excuse to use PTC, but a
// single-query question is a perfectly fine answer too.
// ════════════════════════════════════════════════════════════════════════

const TASK = context`
  Which country's customers generated the most total revenue, and what
  is the single best-selling track (by revenue) among customers from
  that country? Each answer depends on the previous one.`;
// ════════════════════════════════════════════════════════════════════════
// TODO 2: Write a simple eval check for the agent's answer.
//
// evalAnswer(answerText) runs after the agent responds. Independently
// work out what you believe the right answer is (run your own SQL query,
// do the math by hand, whatever) and compare it against answerText. Print
// whatever verdict makes sense; this doesn't need to be a strict
// pass/fail, a reasoned printout is fine.
// ════════════════════════════════════════════════════════════════════════

// TODO 2 filled in
async function evalAnswer(answerText: string): Promise<void> {
  const db = new DatabaseSync(dbPatt);
  let topCountry: { Country: string; rev: number };
  let topTrack: { Name: string; rev: number };
  try {
    topCountry = db
      .prepare(
        `SELECT Customer.Country, SUM(InvoiceLine.UnitPrice * InvoiceLine.Quantity) AS rev
         FROM InvoiceLine
         JOIN Invoice USING(InvoiceId)
         JOIN Customer USING(CustomerId)
         GROUP BY Customer.Country
         ORDER BY rev DESC
         LIMIT 1`,
      )
      .get() as { Country: string; rev: number };

    topTrack = db
      .prepare(
        `SELECT Track.Name, SUM(InvoiceLine.UnitPrice * InvoiceLine.Quantity) AS rev
         FROM InvoiceLine
         JOIN Invoice USING(InvoiceId)
         JOIN Customer USING(CustomerId)
         JOIN Track USING(TrackId)
         WHERE Customer.Country = ?
         GROUP BY Track.TrackId
         ORDER BY rev DESC
         LIMIT 1`,
      )
      .get(topCountry.Country) as { Name: string; rev: number };
  } finally {
    db.close();
  }
}

if (TASK === null) {
  throw new Error('TODO 1: see the comment block above');
}

const agent = createDeepAgent({
  model,
  tools: [queryChinook],
  middleware: [createCodeInterpreterMiddleware({ ptc: ['query_chinook'] })],
  systemPrompt: SYSTEM,
});

const result = await agent.invoke(
  { messages: [{ role: 'user', content: TASK }] },
  { configurable: { thread_id: randomUUID() } },
);

const answer = String(result.messages.at(-1)?.text ?? '');
console.log(answer);
evalAnswer(answer);
