import { createDeepAgent, FilesystemBackend } from 'deepagents';
import { model } from '../src/model';

const agent = createDeepAgent({
  model,
  backend: new FilesystemBackend({ rootDir: './m2/backend/', virtualMode: true }),
});

const res = await agent.invoke({
  messages: {
    role: 'human',
    content: 'hey read the pome about software engineering that is stored in my file system',
  },
});

console.log(res);
