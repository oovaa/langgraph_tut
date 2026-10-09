import { Command, interrupt, MemorySaver, StateGraph } from '@langchain/langgraph';
import { registry } from '@langchain/langgraph/zod';
import z, { type infer as zInfer } from 'zod';
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

const StateDefinition = z.object({
  userInput: z.string().optional(),
  nlist: z.array(z.string()).register(registry, {
    reducer: { fn: (left: string[], rigt: string[]) => left.concat(rigt) },
    default: () => [],
  }),
});

type State = zInfer<typeof StateDefinition>;

// Added `async` here so you can use `await interrupt(...)`
const nodeA = async (state: State): Promise<Command> => {
  const select = state.userInput;
  let nexNode;
  // console.log(state.nlist);

  if (select == 'b') nexNode = 'b';
  else if (select == 'c') nexNode = 'c';
  else if (select == 'q') nexNode = '__end__';
  else {
    const admin = await interrupt({ message: 'unexpected input coninut? [y/n]' });
    console.log('admin response: ', admin);

    if (admin === 'y') {
      nexNode = 'b';
    } else {
      nexNode = '__end__';
      return new Command({
        // update: { nlist: [select] },
        goto: nexNode,
      });
    }
  }

  return new Command({
    update: { nlist: [select] },
    goto: nexNode,
  });
};

const nodeC = (state: State) => {
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

const hasInterrupt = (result: any) => {
  return result && result.__interrupt__ && Array.isArray(result.__interrupt__);
};

async function getUserInput(promptText: string): Promise<string> {
  const rl = readline.createInterface({ input, output });

  try {
    const answer = await rl.question(promptText);
    return answer;
  } finally {
    rl.close(); // Ensures the terminal doesn't hang after getting the input
  }
}

// Wrapped your execution loop in an async function
async function main() {
  while (true) {
    const threadId = await getUserInput('enter thread id: ');
    if (threadId == 'q') break;

    const config = { configurable: { thread_id: threadId } };
    console.log(`into thread ${threadId}`);

    while (true) {
      const nextStep = await getUserInput('c, b or q: ');
      const inputState: Partial<State> = { userInput: nextStep };

      const prevState = await graph.getState(config);
      const prevLen = prevState.values?.nlist?.length || 0;

      let result = await graph.invoke(inputState, config);
      console.log(`state after adding ${nextStep}: ${result.nlist}`);

      if (hasInterrupt(result)) {
        console.log('-'.repeat(80));
        console.log('interrupt: ', result.__interrupt__);

        const interruptMessage = result.__interrupt__.at(-1);
        const human = await getUserInput(`${interruptMessage.value.message}`);

        result = await graph.invoke(new Command({ resume: human }), config);
        console.log('-'.repeat(80));
      }

      if (result.nlist.length > prevLen)
        console.log(`value ${inputState.userInput} is added to thread ${threadId} `);

      if (result.nlist.at(-1) == 'q') break;
    }
  }
}

// Execute the main function
main();
