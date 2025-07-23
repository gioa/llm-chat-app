
import { db } from '../db';
import { messagesTable, conversationsTable } from '../db/schema';
import { type CreateMessageInput, type Message } from '../schema';
import { eq } from 'drizzle-orm';

export const createMessage = async (input: CreateMessageInput): Promise<Message> => {
  try {
    // Create the message
    const result = await db.insert(messagesTable)
      .values({
        conversation_id: input.conversation_id,
        role: input.role,
        content: input.content
      })
      .returning()
      .execute();

    const message = result[0];

    // Update the conversation's updated_at timestamp
    await db.update(conversationsTable)
      .set({ updated_at: new Date() })
      .where(eq(conversationsTable.id, input.conversation_id))
      .execute();

    return message;
  } catch (error) {
    console.error('Message creation failed:', error);
    throw error;
  }
};
