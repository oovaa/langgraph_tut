import { ChatCohere } from '@langchain/cohere';
import { StateGraph } from '@langchain/langgraph';
import { registry } from '@langchain/langgraph/zod';
import z, { type infer as zInfer } from 'zod';

const llm = new ChatCohere({
  model: 'command-a-03-2025',
  temperature: 0,
  maxRetries: 2,
});

const stateDefiniton = z.object({
  nlist: z.array(z.string()).register(registry, {
    default: () => ['staaaaart'],
  }),
});

type State = zInfer<typeof stateDefiniton>;

function nodeA(state: State) {
  console.log(`node a is dealing with the state ${state.nlist}`);
  const note = 'hey there';
  console.log(`the note ${note}`);
  return { nlist: [note] };
}

export const graph = new StateGraph(stateDefiniton)
  .addNode('a', nodeA)
  .addEdge('__start__', 'a')
  .addEdge('a', '__end__')
  .compile();

const initState = { nlist: ['hey man'] };

console.log('running graph');

const result = await graph.invoke({}); // or pass init state

console.log('result', result);

