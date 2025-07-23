
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { conversationsTable, messagesTable } from '../db/schema';
import { type CreateMessageInput } from '../schema';
import { createMessage } from '../handlers/create_message';
import { eq } from 'drizzle-orm';

describe('createMessage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a message', async () => {
    // Create a conversation first
    const conversationResult = await db.insert(conversationsTable)
      .values({ name: 'Test Conversation' })
      .returning()
      .execute();
    const conversation = conversationResult[0];

    const testInput: CreateMessageInput = {
      conversation_id: conversation.id,
      role: 'user',
      content: 'Hello, this is a test message'
    };

    const result = await createMessage(testInput);

    // Basic field validation
    expect(result.conversation_id).toEqual(conversation.id);
    expect(result.role).toEqual('user');
    expect(result.content).toEqual('Hello, this is a test message');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save message to database', async () => {
    // Create a conversation first
    const conversationResult = await db.insert(conversationsTable)
      .values({ name: 'Test Conversation' })
      .returning()
      .execute();
    const conversation = conversationResult[0];

    const testInput: CreateMessageInput = {
      conversation_id: conversation.id,
      role: 'assistant',
      content: 'This is an assistant response'
    };

    const result = await createMessage(testInput);

    // Query database to verify message was saved
    const messages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.id, result.id))
      .execute();

    expect(messages).toHaveLength(1);
    expect(messages[0].conversation_id).toEqual(conversation.id);
    expect(messages[0].role).toEqual('assistant');
    expect(messages[0].content).toEqual('This is an assistant response');
    expect(messages[0].created_at).toBeInstanceOf(Date);
  });

  it('should update conversations updated_at timestamp', async () => {
    // Create a conversation first
    const conversationResult = await db.insert(conversationsTable)
      .values({ name: 'Test Conversation' })
      .returning()
      .execute();
    const conversation = conversationResult[0];
    const originalUpdatedAt = conversation.updated_at;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const testInput: CreateMessageInput = {
      conversation_id: conversation.id,
      role: 'user',
      content: 'This should update the conversation timestamp'
    };

    await createMessage(testInput);

    // Check that conversation's updated_at was updated
    const updatedConversations = await db.select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, conversation.id))
      .execute();

    expect(updatedConversations).toHaveLength(1);
    expect(updatedConversations[0].updated_at).toBeInstanceOf(Date);
    expect(updatedConversations[0].updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should handle foreign key constraint violations', async () => {
    const testInput: CreateMessageInput = {
      conversation_id: 999999, // Non-existent conversation ID
      role: 'user',
      content: 'This should fail'
    };

    await expect(createMessage(testInput)).rejects.toThrow(/foreign key constraint/i);
  });
});
