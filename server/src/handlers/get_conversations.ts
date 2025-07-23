
import { db } from '../db';
import { conversationsTable } from '../db/schema';
import { type Conversation } from '../schema';
import { desc } from 'drizzle-orm';

export const getConversations = async (): Promise<Conversation[]> => {
  try {
    const results = await db.select()
      .from(conversationsTable)
      .orderBy(desc(conversationsTable.updated_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get conversations:', error);
    throw error;
  }
};
