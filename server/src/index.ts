
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schema types
import { 
  createConversationInputSchema,
  updateConversationInputSchema,
  deleteConversationInputSchema,
  getConversationMessagesInputSchema,
  createMessageInputSchema,
  sendMessageInputSchema
} from './schema';

// Import handlers
import { createConversation } from './handlers/create_conversation';
import { getConversations } from './handlers/get_conversations';
import { updateConversation } from './handlers/update_conversation';
import { deleteConversation } from './handlers/delete_conversation';
import { getConversationMessages } from './handlers/get_conversation_messages';
import { createMessage } from './handlers/create_message';
import { sendMessage } from './handlers/send_message';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),
  
  // Conversation management
  createConversation: publicProcedure
    .input(createConversationInputSchema)
    .mutation(({ input }) => createConversation(input)),
    
  getConversations: publicProcedure
    .query(() => getConversations()),
    
  updateConversation: publicProcedure
    .input(updateConversationInputSchema)
    .mutation(({ input }) => updateConversation(input)),
    
  deleteConversation: publicProcedure
    .input(deleteConversationInputSchema)
    .mutation(({ input }) => deleteConversation(input)),
    
  // Message management
  getConversationMessages: publicProcedure
    .input(getConversationMessagesInputSchema)
    .query(({ input }) => getConversationMessages(input)),
    
  createMessage: publicProcedure
    .input(createMessageInputSchema)
    .mutation(({ input }) => createMessage(input)),
    
  // Main chat functionality
  sendMessage: publicProcedure
    .input(sendMessageInputSchema)
    .mutation(({ input }) => sendMessage(input))
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
