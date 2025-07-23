
import { z } from 'zod';

// Message role enum
export const messageRoleSchema = z.enum(['user', 'assistant']);
export type MessageRole = z.infer<typeof messageRoleSchema>;

// Conversation schema
export const conversationSchema = z.object({
  id: z.number(),
  name: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Conversation = z.infer<typeof conversationSchema>;

// Message schema
export const messageSchema = z.object({
  id: z.number(),
  conversation_id: z.number(),
  role: messageRoleSchema,
  content: z.string(),
  created_at: z.coerce.date()
});

export type Message = z.infer<typeof messageSchema>;

// Input schema for creating conversations
export const createConversationInputSchema = z.object({
  name: z.string().min(1).max(255)
});

export type CreateConversationInput = z.infer<typeof createConversationInputSchema>;

// Input schema for updating conversation name
export const updateConversationInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).max(255)
});

export type UpdateConversationInput = z.infer<typeof updateConversationInputSchema>;

// Input schema for deleting conversation
export const deleteConversationInputSchema = z.object({
  id: z.number()
});

export type DeleteConversationInput = z.infer<typeof deleteConversationInputSchema>;

// Input schema for creating messages
export const createMessageInputSchema = z.object({
  conversation_id: z.number(),
  role: messageRoleSchema,
  content: z.string().min(1)
});

export type CreateMessageInput = z.infer<typeof createMessageInputSchema>;

// Input schema for getting conversation messages
export const getConversationMessagesInputSchema = z.object({
  conversation_id: z.number()
});

export type GetConversationMessagesInput = z.infer<typeof getConversationMessagesInputSchema>;

// Input schema for sending a message to LLM
export const sendMessageInputSchema = z.object({
  conversation_id: z.number(),
  content: z.string().min(1)
});

export type SendMessageInput = z.infer<typeof sendMessageInputSchema>;

// Response schema for LLM message sending
export const sendMessageResponseSchema = z.object({
  user_message: messageSchema,
  assistant_message: messageSchema
});

export type SendMessageResponse = z.infer<typeof sendMessageResponseSchema>;
