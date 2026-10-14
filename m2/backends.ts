import { CompositeBackend, createDeepAgent, FilesystemBackend, StateBackend } from 'deepagents';
import { model } from '../src/model';
import { mkdir } from 'node:fs/promises';

const path = './m2/backend/';
await mkdir(path, { recursive: true });

const agent = createDeepAgent({
  model,
  backend: new CompositeBackend(new StateBackend(), {
    refrence: new FilesystemBackend({
      rootDir: path,
      virtualMode: true,
    }),
  }),
  permissions: [{ operations: ['write'], paths: [path], mode: 'allow' }],
});

const res = await agent.invoke({
  messages: {
    role: 'human',
    content: 'hey read the pome about software engineering that is stored in my file system',
  },
});

console.log(res);
