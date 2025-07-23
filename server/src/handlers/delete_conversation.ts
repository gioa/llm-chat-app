
import { db } from '../db';
import { conversationsTable } from '../db/schema';
import { type DeleteConversationInput } from '../schema';
import { eq } from 'drizzle-orm';

export const deleteConversation = async (input: DeleteConversationInput): Promise<{ success: boolean }> => {
  try {
    // Delete conversation - messages will be automatically deleted due to cascade delete constraint
    const result = await db.delete(conversationsTable)
      .where(eq(conversationsTable.id, input.id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Conversation deletion failed:', error);
    throw error;
  }
};
