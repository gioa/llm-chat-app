
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { conversationsTable } from '../db/schema';
import { type CreateConversationInput } from '../schema';
import { getConversations } from '../handlers/get_conversations';
import { eq } from 'drizzle-orm';

describe('getConversations', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no conversations exist', async () => {
    const result = await getConversations();
    expect(result).toEqual([]);
  });

  it('should return all conversations', async () => {
    // Create test conversations
    await db.insert(conversationsTable)
      .values([
        { name: 'First Conversation' },
        { name: 'Second Conversation' }
      ])
      .execute();

    const result = await getConversations();

    expect(result).toHaveLength(2);
    expect(result[0].name).toBeDefined();
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return conversations ordered by updated_at desc', async () => {
    // Create first conversation
    const first = await db.insert(conversationsTable)
      .values({ name: 'First Conversation' })
      .returning()
      .execute();

    // Wait a bit to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    // Create second conversation
    const second = await db.insert(conversationsTable)
      .values({ name: 'Second Conversation' })
      .returning()
      .execute();

    // Wait a bit more
    await new Promise(resolve => setTimeout(resolve, 10));

    // Update the first conversation to make it the most recent
    await db.update(conversationsTable)
      .set({ 
        name: 'Updated First Conversation',
        updated_at: new Date()
      })
      .where(eq(conversationsTable.id, first[0].id))
      .execute();

    const result = await getConversations();

    expect(result).toHaveLength(2);
    // First result should be the updated conversation (most recent updated_at)
    expect(result[0].name).toEqual('Updated First Conversation');
    expect(result[1].name).toEqual('Second Conversation');
    
    // Verify ordering by timestamp
    expect(result[0].updated_at >= result[1].updated_at).toBe(true);
  });

  it('should return conversations with all required fields', async () => {
    await db.insert(conversationsTable)
      .values({ name: 'Test Conversation' })
      .execute();

    const result = await getConversations();

    expect(result).toHaveLength(1);
    const conversation = result[0];
    
    expect(typeof conversation.id).toBe('number');
    expect(typeof conversation.name).toBe('string');
    expect(conversation.created_at).toBeInstanceOf(Date);
    expect(conversation.updated_at).toBeInstanceOf(Date);
    expect(conversation.name).toEqual('Test Conversation');
  });
});
