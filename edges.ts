import { StateGraph } from '@langchain/langgraph';
import { registry } from '@langchain/langgraph/zod';
import z, { type infer as zInfer } from 'zod';

const stateDEfinition = z.object({
  nlist: z.array(z.string()).register(registry, {
    reducer: {
      fn: (left: string[], right: string[]) => left.concat(right),
    },
    default: () => [], // so you dont need to invoke value when u inveoke the graph
  }),
});

type State = zInfer<typeof stateDEfinition>;

const nodeA = (state: State) => {
  console.log('adding A to', state.nlist);
  return { nlist: ['A'] };
};

const nodeC = (state: State) => {
  console.log('adding C to', state.nlist);
  return { nlist: ['C'] };
};

const nodeB = (state: State) => {
  console.log('adding B to', state.nlist);
  return { nlist: ['B'] };
};

const noded = (state: State) => {
  console.log('adding d to', state.nlist);
  return { nlist: ['d'] };
};

const nodeCC = (state: State) => {
  console.log('adding CC to', state.nlist);
  return { nlist: ['CC'] };
};

const nodeBB = (state: State) => {
  console.log('adding BB to', state.nlist);
  return { nlist: ['BB'] };
};

const graph = new StateGraph(stateDEfinition)
  .addNode('a', nodeA)
  .addNode('b', nodeB)
  .addNode('bb', nodeBB)
  .addNode('c', nodeC)
  .addNode('d', noded)
  .addNode('cc', nodeCC)
  // adding edges from node to node
  .addEdge('__start__', 'a')
  .addEdge('a', 'b')
  .addEdge('a', 'c')
  .addEdge('b', 'bb')
  .addEdge('c', 'cc')
  .addEdge('cc', 'd')
  .addEdge('bb', 'd')
  .addEdge('d', '__end__')
  // here we go one super step on time which is a lyer a time not going to the next unless the siblings nodes are done
  .compile();

console.log((await graph.invoke({})).nlist);
