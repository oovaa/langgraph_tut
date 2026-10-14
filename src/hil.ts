import { createDeepAgent } from 'deepagents';
import { tool, ToolMessage } from 'langchain';
import z from 'zod';
import { model } from './model';
import { createInterface } from 'node:readline/promises';
import { Command, INTERRUPT, isInterrupted, MemorySaver } from '@langchain/langgraph';

interface ActionRequest {
  name: string;
  args: Record<string, unknown>;
}

interface ApprovalRequest {
  actionRequests: ActionRequest[];
}

const SYSTEM_PROMPT = `You are a helpful assistant that can send emails.

Rules:
- Use send_email when the user asks you to send an email.
- Keep emails concise and professional.
- Do not claim an email was sent until the tool result confirms it.
- When confirming an email was sent, quote the subject and body from the tool result, not the original request.
`;
const sendEmail = tool(
  ({ to, subject, body }) =>
    `Email sent to ${to} with subject ${JSON.stringify(subject)}. Body: ${body}`,
  {
    name: 'send_email',
    description: 'Send an email to a recipient.',
    schema: z.object({
      to: z.string(),
      subject: z.string(),
      body: z.string(),
    }),
  },
);

const agent = createDeepAgent({
  systemPrompt: SYSTEM_PROMPT,
  model: model,
  checkpointer: new MemorySaver(),
  interruptOn: { send_email: true },
  tools: [sendEmail],
});

const config = { configurable: { thread_id: 'hitl' } };

let result = await agent.invoke(
  {
    messages: {
      role: 'human',
      content: 'Send an email to jane@example.com saying I will be 10 minutes late.',
    },
  },
  config,
);

const rl = createInterface({ input: process.stdin, output: process.stdout });

while (isInterrupted<ApprovalRequest>(result) && result[INTERRUPT].length) {
  console.log(result[INTERRUPT].at(0)?.value);

  const pending = result[INTERRUPT][0]!.value!; // this has actions requested which are the tool name and its args this is the main data we gonna use. also has review configs whcih are also tool name and its allowed actions (approce,edit.....)
  const decisions = []; // this array maps to the requested actions array each entry is an answer for an entry in requested actions

  for (const req of pending.actionRequests) {
    console.log(`\nApproval required for ${req.name}:`);
    console.log(req.args);

    const choice = (await rl.question('\nApprove, edit, or reject? (approve/edit/reject): '))
      .trim()
      .toLowerCase();

    if (['approve', 'yes', 'y'].includes(choice)) {
      decisions.push({ type: 'approve' });
    } else if (['edit', 'e'].includes(choice)) {
      const editedArgs = { ...req.args };
      editedArgs.body = await rl.question('New email body: ');
      decisions.push({
        type: 'edit',
        editedAction: { name: req.name, args: editedArgs },
      });
    } else {
      decisions.push({ type: 'reject', message: 'User rejected this email draft.' });
    }
  }

  result = await agent.invoke(new Command({ resume: { decisions } }), config);
}

rl.close();
for (const msg of result.messages) {
  if (ToolMessage.isInstance(msg) && msg.name === 'send_email') {
    console.log(msg.text);
    break;
  }
}
