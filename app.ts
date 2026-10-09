import { Command, interrupt, MemorySaver, StateGraph } from '@langchain/langgraph';
import z, { type infer as zInfer } from 'zod';
import { ChatGroq } from '@langchain/groq';

const llm = new ChatGroq({
  model: 'openai/gpt-oss-20b',
});

export const EmailClassificationSchema = z.object({
  intent: z.enum(['question', 'bug', 'billing', 'feature', 'complex']),
  urgency: z.enum(['low', 'medium', 'high', 'critical']),
  topic: z.string(),
  summary: z.string(),
});

export const EmailStateDefinition = z.object({
  emailId: z.string(),
  emailContent: z.string(),
  snederEmail: z.string(),
  classification: EmailClassificationSchema.optional(),
  tikcetId: z.string().optional(),
  searchResults: z.array(z.string()).optional(),
  customerHistort: z.record(z.string(), z.any()).optional(),
  draftResponse: z.string().optional(),
});

export type EmailAgentState = zInfer<typeof EmailStateDefinition>;

const memory = new MemorySaver();

export const readEmail = async (state: EmailAgentState) => {
  console.log(`processing email from sender: ${state.snederEmail}`);

  return {};
};

export const calssifyIntent = async (state: EmailAgentState) => {
  console.log(`Calssifying intent of the email...`);
  const structuredLlm = llm.withStructuredOutput(EmailClassificationSchema);

  const classificatioPrompt = `
  Analyse this email and classify it:
  
    Email: ${state.emailContent}
    Sender: ${state.snederEmail}

    provide classification including intent,urgency,summary,topic.
    `;

  try {
    const classification = await structuredLlm.invoke(classificatioPrompt);
    console.log(`Classification: ${JSON.stringify(classification)}`);

    return { classification };
  } catch (error) {
    console.log(`there is an error in classification: ${error}`);
    return {
      classification: {
        intent: 'question',
        topic: 'general inquery',
        urgency: 'low',
        summary: 'unalbe to classify email automatically',
      },
    };
  }
};

export const bugTracking = async (state: EmailAgentState) => {
  const tikcetId = `BUG_${Date.now()}`;

  console.log(`ticket :${tikcetId} is created `);

  return { tikcetId };
};

export const searchDocumentation = async (state: EmailAgentState) => {
  console.log(`searching documetaion...`);

  const classification = state.classification ?? {
    intent: 'question',
    topic: 'general inquery',
    urgency: 'low',
    summary: 'unalbe to classify email automatically',
  };

  try {
    const searchResults = [
      `Documatation for the ${classification.intent}: Basic information about ${classification.topic}`,
      `FQA entry: common questions related to ${classification.topic}`,
      `Knowledge Base Article: how to handle ${classification.intent} requests`,
    ];

    console.log(`found ${searchResults.length} documents`);

    return { searchResults };
  } catch (error) {
    console.log(`error in search documentation ${error}`);
    return { searchResults: ['could not search in the documntation'] };
  }
};

export const writeResponse = async (state: EmailAgentState) => {
  const classification = state.classification ?? {
    intent: 'question',
    topic: 'general inquery',
    urgency: 'low',
    summary: 'unalbe to classify email automatically',
  };

  const contextSection: string[] = [];

  if (state.searchResults) {
    const formattedContext = state.searchResults.map((doc) => `- ${doc}`).join('\n');
    contextSection.push(`Relevent Context :${formattedContext}`);
  }

  const draftPrompt = `

    Draft a response for this costumer email:
    Email content: ${state.emailContent}
    Email intent: ${classification.intent}
    Ergenct: ${classification.urgency}

    Relevent Context:

    ${contextSection.join('\n\n')}


    - Be profissional and helpful
    - be brief
    - use the provided context
  `;
  try {
    const response = await llm.invoke(draftPrompt);

    const reviewedUrgencies = ['high', 'complex', 'critical'];

    const needsReview = reviewedUrgencies.includes(classification.urgency);

    const goto = needsReview ? 'human_review' : 'send_reply';

    return new Command({
      update: { draftResponse: response.content },
      goto,
    });
  } catch (error) {
    console.log(`error in the draft response creation ${error}`);
    return new Command({
      update: { draftResponse: `Error generating the response` },
      goto: 'human_review',
    });
  }
};

export const humanReview = async (state: EmailAgentState) => {
  const classification = state.classification ?? {
    intent: 'question',
    topic: 'general inquery',
    urgency: 'low',
    summary: 'unalbe to classify email automatically',
  };

  const humanDesision = interrupt({ ...state, action: 'please review/edit this response' });

  if (humanDesision.approved) {
    const response = humanDesision.editedResponse ?? state.draftResponse;

    return new Command({
      update: { draftResponse: response },
      goto: 'send_reply',
    });
  }

  return new Command({
    goto: '__end__',
  });
};

export const sendReply = async (state: EmailAgentState) => {
  console.log(`in sending reply node`);
  const review = state.draftResponse;
  console.log(`dreaft response ${review?.substring(0, 60)}.....`);

  return {};
};

export const graph = new StateGraph(EmailStateDefinition)
  //add nodes
  .addNode('read_email', readEmail)
  .addNode('classify_intent', calssifyIntent)
  .addNode('bug_tracking', bugTracking)
  .addNode('search_documentation', searchDocumentation)
  .addNode('write_respnose', writeResponse, { ends: ['human_review', 'send_reply'] })
  .addNode('human_review', humanReview, { ends: ['send_reply', '__end__'] })
  .addNode('send_reply', sendReply)
  // add edges
  .addEdge('__start__', 'read_email')
  .addEdge('read_email', 'classify_intent')
  .addEdge('classify_intent', 'bug_tracking')
  .addEdge('classify_intent', 'search_documentation')
  .addEdge('bug_tracking', 'write_respnose')
  .addEdge('search_documentation', 'write_respnose')
  .addEdge('send_reply', '__end__')
  .compile({ checkpointer: memory });
