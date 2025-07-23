
import { db } from '../db';
import { messagesTable } from '../db/schema';
import { type GetConversationMessagesInput, type Message } from '../schema';
import { eq, asc } from 'drizzle-orm';

export const getConversationMessages = async (input: GetConversationMessagesInput): Promise<Message[]> => {
  try {
    const results = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.conversation_id, input.conversation_id))
      .orderBy(asc(messagesTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get conversation messages:', error);
    throw error;
  }
};
