
import { db } from '../db';
import { conversationsTable } from '../db/schema';
import { type CreateConversationInput, type Conversation } from '../schema';

export const createConversation = async (input: CreateConversationInput): Promise<Conversation> => {
  try {
    // Insert conversation record
    const result = await db.insert(conversationsTable)
      .values({
        name: input.name
      })
      .returning()
      .execute();

    // Return the created conversation
    const conversation = result[0];
    return conversation;
  } catch (error) {
    console.error('Conversation creation failed:', error);
    throw error;
  }
};
