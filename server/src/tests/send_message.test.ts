
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { conversationsTable, messagesTable } from '../db/schema';
import { type SendMessageInput } from '../schema';
import { sendMessage } from '../handlers/send_message';
import { eq } from 'drizzle-orm';

describe('sendMessage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create user and assistant messages', async () => {
    // Create test conversation
    const conversationResult = await db.insert(conversationsTable)
      .values({ name: 'Test Conversation' })
      .returning()
      .execute();
    
    const conversationId = conversationResult[0].id;

    const input: SendMessageInput = {
      conversation_id: conversationId,
      content: 'Hello, how are you?'
    };

    const result = await sendMessage(input);

    // Verify user message
    expect(result.user_message.conversation_id).toEqual(conversationId);
    expect(result.user_message.role).toEqual('user');
    expect(result.user_message.content).toEqual('Hello, how are you?');
    expect(result.user_message.id).toBeDefined();
    expect(result.user_message.created_at).toBeInstanceOf(Date);

    // Verify assistant message
    expect(result.assistant_message.conversation_id).toEqual(conversationId);
    expect(result.assistant_message.role).toEqual('assistant');
    expect(result.assistant_message.content).toContain('placeholder LLM response');
    expect(result.assistant_message.id).toBeDefined();
    expect(result.assistant_message.created_at).toBeInstanceOf(Date);

    // Verify messages are different
    expect(result.user_message.id).not.toEqual(result.assistant_message.id);
  });

  it('should save both messages to database', async () => {
    // Create test conversation
    const conversationResult = await db.insert(conversationsTable)
      .values({ name: 'Test Conversation' })
      .returning()
      .execute();
    
    const conversationId = conversationResult[0].id;

    const input: SendMessageInput = {
      conversation_id: conversationId,
      content: 'Test message content'
    };

    const result = await sendMessage(input);

    // Verify messages exist in database
    const messages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.conversation_id, conversationId))
      .orderBy(messagesTable.created_at)
      .execute();

    expect(messages).toHaveLength(2);
    
    // Verify user message
    expect(messages[0].id).toEqual(result.user_message.id);
    expect(messages[0].role).toEqual('user');
    expect(messages[0].content).toEqual('Test message content');
    
    // Verify assistant message
    expect(messages[1].id).toEqual(result.assistant_message.id);
    expect(messages[1].role).toEqual('assistant');
    expect(messages[1].content).toContain('placeholder LLM response');
  });

  it('should update conversation updated_at timestamp', async () => {
    // Create test conversation
    const conversationResult = await db.insert(conversationsTable)
      .values({ name: 'Test Conversation' })
      .returning()
      .execute();
    
    const conversationId = conversationResult[0].id;
    const originalUpdatedAt = conversationResult[0].updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: SendMessageInput = {
      conversation_id: conversationId,
      content: 'Update timestamp test'
    };

    await sendMessage(input);

    // Verify updated_at was changed
    const updatedConversation = await db.select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, conversationId))
      .execute();

    expect(updatedConversation[0].updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should include conversation context in LLM response', async () => {
    // Create test conversation
    const conversationResult = await db.insert(conversationsTable)
      .values({ name: 'Test Conversation' })
      .returning()
      .execute();
    
    const conversationId = conversationResult[0].id;

    // Add some existing messages
    await db.insert(messagesTable)
      .values([
        { conversation_id: conversationId, role: 'user', content: 'First message' },
        { conversation_id: conversationId, role: 'assistant', content: 'First response' }
      ])
      .execute();

    const input: SendMessageInput = {
      conversation_id: conversationId,
      content: 'Third message'
    };

    const result = await sendMessage(input);

    // Verify the assistant response mentions the context count
    // (should be 3 messages: 2 existing + 1 new user message)
    expect(result.assistant_message.content).toContain('3 messages');
  });

  it('should throw error for non-existent conversation', async () => {
    const input: SendMessageInput = {
      conversation_id: 999999, // Non-existent ID
      content: 'Test message'
    };

    await expect(sendMessage(input)).rejects.toThrow(/conversation.*not found/i);
  });
});
