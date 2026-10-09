import { Command, StateGraph } from '@langchain/langgraph';
import { registry } from '@langchain/langgraph/zod';
import z, { type infer as zInfer } from 'zod';
import { ne } from 'zod/locales';

const stateDEfinition = z.object({
  nlist: z.array(z.string()).register(registry, {
    reducer: {
      fn: (left: string[], right: string[]) => left.concat(right),
    },
    default: () => [], // so you dont need to invoke value when u inveoke the graph
  }),
});

type State = zInfer<typeof stateDEfinition>;

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

const graph = new StateGraph(stateDEfinition)
  .addNode('a', nodeA, { ends: ['b', 'c'] })
  .addNode('b', nodeB)
  .addNode('c', nodeC)
  .addEdge('__start__', 'a')
  .addEdge('b', '__end__')
  .addEdge('c', '__end__')
  .compile();

const inintStat: State = { nlist: ['c'] };

console.log(await graph.invoke(inintStat));
