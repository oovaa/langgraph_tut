import { Command, MemorySaver, StateGraph } from '@langchain/langgraph';
import { registry } from '@langchain/langgraph/zod';
import z, { type infer as zInfer } from 'zod';
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

const StateDefinition = z.object({
  nlist: z.array(z.string()).register(registry, {
    reducer: { fn: (left: string[], rigt: string[]) => left.concat(rigt) },
    default: () => [],
  }),
});

type State = zInfer<typeof StateDefinition>;

const nodeA = (state: State): Command => {
  const select = state.nlist.at(-1);
  let nexNode;
  console.log(state.nlist);

  if (select == 'b') nexNode = 'b';
  else if (select == 'c') nexNode = 'c';
  else nexNode = '__end__';

  return new Command({
    // update: { nlist: [select] },
    goto: nexNode,
  });
};

const nodeC = (state: State) => {
  console.log(state.nlist);

  console.log('adding C to', state.nlist);
  return { nlist: ['C'] };
};

const nodeB = (state: State) => {
  console.log('adding B to', state.nlist);
  return { nlist: ['B'] };
};

const memory = new MemorySaver();

const graph = new StateGraph(StateDefinition)
  .addNode('a', nodeA, { ends: ['b', 'c'] })
  .addNode('b', nodeB)
  .addNode('c', nodeC)
  .addEdge('__start__', 'a')
  .addEdge('b', '__end__')
  .addEdge('c', '__end__')
  .compile({ checkpointer: memory });

async function getUserInput(promptText: string): Promise<string> {
  const rl = readline.createInterface({ input, output });

  try {
    const answer = await rl.question(promptText);
    return answer;
  } finally {
    rl.close(); // Ensures the terminal doesn't hang after getting the input
  }
}

while (true) {
  const threadId = await getUserInput('enter thread id: ');
  if (threadId == 'q') break;

  const config = { configurable: { thread_id: threadId } };
  console.log(`into thread ${threadId}`);

  while (true) {
    const nextStep = await getUserInput('c, b or q');
    const inputState: State = { nlist: [nextStep] };

    const result = await graph.invoke(inputState, config);
    console.log(`value ${inputState.nlist} is added to thread ${threadId} `);

    if (result.nlist.at(-1) == 'q') break;
  }
}
