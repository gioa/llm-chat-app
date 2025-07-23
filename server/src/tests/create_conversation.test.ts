
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { conversationsTable } from '../db/schema';
import { type CreateConversationInput } from '../schema';
import { createConversation } from '../handlers/create_conversation';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateConversationInput = {
  name: 'My Test Conversation'
};

describe('createConversation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a conversation', async () => {
    const result = await createConversation(testInput);

    // Basic field validation
    expect(result.name).toEqual('My Test Conversation');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save conversation to database', async () => {
    const result = await createConversation(testInput);

    // Query using proper drizzle syntax
    const conversations = await db.select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, result.id))
      .execute();

    expect(conversations).toHaveLength(1);
    expect(conversations[0].name).toEqual('My Test Conversation');
    expect(conversations[0].created_at).toBeInstanceOf(Date);
    expect(conversations[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create conversations with different names', async () => {
    const firstInput: CreateConversationInput = {
      name: 'First Conversation'
    };
    
    const secondInput: CreateConversationInput = {
      name: 'Second Conversation'
    };

    const firstResult = await createConversation(firstInput);
    const secondResult = await createConversation(secondInput);

    expect(firstResult.name).toEqual('First Conversation');
    expect(secondResult.name).toEqual('Second Conversation'); 
    expect(firstResult.id).not.toEqual(secondResult.id);

    // Verify both conversations exist in database
    const allConversations = await db.select()
      .from(conversationsTable)
      .execute();

    expect(allConversations).toHaveLength(2);
    expect(allConversations.map(c => c.name)).toContain('First Conversation');
    expect(allConversations.map(c => c.name)).toContain('Second Conversation');
  });
});
