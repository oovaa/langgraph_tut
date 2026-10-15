// typescript/m3/m3.1_homework.ts
/**
 * M3.1 Homework: Trigger Chained Summarization.
 *
 * THE IDEA
 * In the lesson, you watched SummarizationMiddleware compress a demo
 * conversation ONCE, past the 85% threshold. But summarization doesn't just
 * fire once and stop: on a long enough conversation it fires again, and again
 * each time it re-summarizes the previous summary plus whatever's new since,
 * while the FULL evicted history keeps piling up in a single backend file at
 * /conversation_history/{sessionId}.md (a session ID generated the first time
 * summarization fires on a thread, not the thread_id itself).
 *
 * This homework asks you to build a conversation on a topic you pick that's
 * long enough to trigger summarization AT LEAST TWICE, then confirm two
 * things: the model can still recall a detail from your very first turn
 * (after being compacted multiple times), and the conversation history file
 * on the backend actually accumulated multiple "Summarized at ..." sections
 * instead of losing earlier ones.
 *
 * WHAT YOU FILL IN
 *   TODO 1: write your own list of user turns (at least 8) about a topic YOU
 *     pick. Put an important detail in one of your first two turns, then
 *     keep talking about the topic for several more turns, and end with a
 *     turn that asks the agent to recall that early detail.
 *   TODO 2: choose model.profile.maxInputTokens so summarization fires at
 *     least twice before your last turn, not just once. Tune it by trial
 *     and error, same as the lesson did with 400. Keep it in the low
 *     thousands; much lower and the final recall fails.
 *
 * RUN
 *   cd typescript
 *   pnpm tsx ./m3/m3.1_homework.ts
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MemorySaver } from '@langchain/langgraph';
import { createDeepAgent, FilesystemBackend } from 'deepagents';
import { HumanMessage } from 'langchain';

import { model } from '../src/model.ts';

// FilesystemBackend writes to real disk instead of state.files.
const __dirname = dirname(fileURLToPath(import.meta.url));
const historyDir = join(__dirname, 'm3.1_history');

// ════════════════════════════════════════════════════════════════════════
// TODO 1: Write your own multi-turn scenario.
//
// Requirements:
//   - At least 8 user turns, all about ONE topic of your choosing.
//   - One of your first two turns should state a concrete detail (a number,
//     a name, a decision).
//   - Your last turn should ask the agent to recall that detail, after
//     several more turns of unrelated follow-up on the same topic.
//
// Example shape (delete this and write your own):
//   function buildTurns(): string[] {
//     return [
//       "I'm planning a two-week trip to ...",
//       "My total budget is ...",
//       ...,
//       ...,
//       ...,
//       "Quick recap: what was my total budget?",
//     ];
//   }
// ════════════════════════════════════════════════════════════════════════

function buildTurns(): string[] {
  return [
    `Diabetes mellitus is an endocrine disease where insulin is ineffective.

There are 2 types of diabetes: DM1 and DM2. DM1 is when the pancreas is not producing enough or any insulin, and DM2 is where the insulin receptors are resistant to insulin.

When insulin is not efficient or not enough, glucose accumulates in the bloodstream, and then we get high glucose levels.

Then we have these signs and symptoms: frequent urination, increased thirst, extreme fatigue, blurry vision, increased hunger, unexplained weight loss, and slow-healing sores and cuts.

The risk factors of DM1 are idiopathic, genetic, or age. For DM2, they are obesity, genetics, physical inactivity, age, race and ethnicity, prediabetes, and medical conditions (high blood pressure, high cholesterol, PCOS, and smoking).

Prevention techniques are reducing weight, treating obesity, exercise and activity, adjusting diet, regular screening, and treating other conditions.

Medical management for DM1 is insulin, and for DM2 it is pharmacological therapy.`,
    `
  I live in a humble house that has 5 trees 2 are lemon 2 are guava, and one custard apple. as you see this is a decent guardin we also have some morning glory flowers.
    in our nghiberhood we have a biiiig super market called Shazam. and a hosbital called Al taahily for ops and delivary. the negbor is kinda rural but getting more urband by time.
    we have the hosbutality palace beeing built near to us but isnt fnihshed yet. we also have the ministory of education near to us and it has a mosque that i pray in called the ministury mosque.
    we also have a mountne near to us called riwawa mountine which has a branch of the gadarif university near to it that has the callages of computer an ecnomic and has the deenship department
  in it. and yeah that is our humble naghberhoode
  `,
    `
  As an under learning future software engineer my main goal is to get good grasp of the skill of turning an idea into a functioning software. while it is simple to say the process is a complex one
    first you need to understand which is the requirements gathering phase you set down and write what is the idea, what are the fnuctionalities, on what platform should it be used,
  how to interact with it. once you have all the information you need about the idea then you turn into the design phase which is more tehnical, here you draw diagrams chose the architecture,
  and the tech stack. then you go the implementation where you actually write code that uses the design phase ourcose as a plan. after this you go into the testing where you test your outcome from the implementation phase
  against the functionlities defined in the requirements phase and fix bugs and issues. then the deployment phase where you actully ship the product or service for users.
  `,
    `here i want you to tell me about nuclear reactors and the arch reactor that tony stark built in the avengers and is it possilbe to have something like this in real life and if so
      in what can it be used?`,
    `where do you find the goblin shark?`,
    'from our comversation list the risk factors for the DM types',
    `also how many trees do we have in my house and of what kind?`,
    `and also from my messages  which is the second phase of software engineering and what is included into it?`,
  ];
}

// ════════════════════════════════════════════════════════════════════════
// TODO 2: Choose the summarization threshold.
//
// Lower model.profile.maxInputTokens to a value that makes
// SummarizationMiddleware fire (at 85% of that number) AT LEAST TWICE
// across your conversation from TODO 1, not just once. The lesson used 400
// for a 5-turn demo that fired once; your number depends on how many turns
// you wrote and how long they are. Must use Object.defineProperty, since a
// plain assignment to model.profile won't work.
//
// Keep it in the low thousands; the filled copy uses 3000 for ten turns. Set
// it much lower and summarization fires on nearly every turn, each summary
// gets compacted away before the next one lands, and the final recall fails.
// ════════════════════════════════════════════════════════════════════════

const MAX_INPUT_TOKENS: number | null = 1000; // TODO 2: replace null with your chosen threshold

Object.defineProperty(model, 'profile', {
  value: { ...model.profile, maxInputTokens: MAX_INPUT_TOKENS },
  configurable: true,
});

const agent = createDeepAgent({
  model,
  backend: new FilesystemBackend({ rootDir: historyDir, virtualMode: true }),
  checkpointer: new MemorySaver(),
  systemPrompt: 'You are a helpful assistant. Keep every response to one sentence.',
});

const THREAD = { configurable: { thread_id: 'homework' } };

interface SummarizationEvent {
  cutoffIndex?: number;
}

interface AgentStateValues {
  messages?: unknown[];
  _summarizationEvent?: SummarizationEvent;
  _summarizationSessionId?: string;
}

async function turn(message: string): Promise<unknown> {
  const result = await agent.invoke({ messages: [new HumanMessage(message)] }, THREAD);
  return result.messages.at(-1)?.text;
}

async function showState(seenCutoffs: Set<number | string>): Promise<boolean> {
  const state = await (
    agent.getState as (config: unknown) => Promise<{ values: AgentStateValues }>
  )(THREAD);
  const messages = state.values.messages ?? [];
  const event = state.values._summarizationEvent;
  console.log(`  stored : ${messages.length} message(s) (raw history, never trimmed)`);
  if (!event) return false;
  const cutoff = event.cutoffIndex ?? '?';
  const isNewEvent = !seenCutoffs.has(cutoff);
  seenCutoffs.add(cutoff);
  const tag = isNewEvent ? '  <-- NEW EVENT' : '';
  console.log(`  model saw : summary + messages[${cutoff}:]  [SUMMARIZED]${tag}`);
  return isNewEvent;
}

async function main(): Promise<void> {
  const turns = buildTurns();
  const seenCutoffs = new Set<number | string>();
  let eventCount = 0;

  for (let i = 0; i < turns.length; i++) {
    const message = turns[i];
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`Turn ${i + 1}  User:  ${message}`);
    const response = await turn(message!);
    console.log(`Turn ${i + 1}  Agent: ${response}`);
    if (await showState(seenCutoffs)) eventCount++;
  }

  console.log(`\nSummarization fired ${eventCount} time(s) across ${turns.length} turns.`);
  if (eventCount < 2) {
    console.log(
      "That's fewer than 2. Lower MAX_INPUT_TOKENS, or add more turns/detail, " +
        'so it fires again before the conversation ends.',
    );
  }

  const state = await (
    agent.getState as (config: unknown) => Promise<{ values: AgentStateValues }>
  )(THREAD);
  const sessionId = state.values._summarizationSessionId;
  const historyPath = sessionId ? `/conversation_history/${sessionId}.md` : null;
  const historyFileOnDisk = historyPath ? join(historyDir, historyPath) : null;
  if (historyFileOnDisk && existsSync(historyFileOnDisk)) {
    const content = readFileSync(historyFileOnDisk, 'utf8');
    const sections = content.split('## Summarized at').length - 1;
    console.log(`\n--- ${historyPath} (${sections} section(s)) ---`);
    console.log(content);
  } else if (historyPath) {
    console.log(`\nNo offloaded history file found at ${historyFileOnDisk}.`);
  }
}

await main();
