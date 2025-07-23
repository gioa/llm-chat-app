
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { conversationsTable, messagesTable } from '../db/schema';
import { type GetConversationMessagesInput } from '../schema';
import { getConversationMessages } from '../handlers/get_conversation_messages';

describe('getConversationMessages', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return messages for a conversation ordered by created_at', async () => {
    // Create test conversation
    const conversation = await db.insert(conversationsTable)
      .values({
        name: 'Test Conversation'
      })
      .returning()
      .execute();

    const conversationId = conversation[0].id;

    // Create messages with different timestamps to test ordering
    const now = new Date();
    const earlier = new Date(now.getTime() - 60000); // 1 minute earlier
    const later = new Date(now.getTime() + 60000); // 1 minute later

    await db.insert(messagesTable)
      .values([
        {
          conversation_id: conversationId,
          role: 'assistant',
          content: 'Second message',
          created_at: later
        },
        {
          conversation_id: conversationId,
          role: 'user', 
          content: 'First message',
          created_at: earlier
        },
        {
          conversation_id: conversationId,
          role: 'user',
          content: 'Third message', 
          created_at: now
        }
      ])
      .execute();

    const input: GetConversationMessagesInput = {
      conversation_id: conversationId
    };

    const result = await getConversationMessages(input);

    // Should return 3 messages
    expect(result).toHaveLength(3);

    // Should be ordered by created_at ascending
    expect(result[0].content).toEqual('First message');
    expect(result[1].content).toEqual('Third message');
    expect(result[2].content).toEqual('Second message');

    // Verify all fields are present
    result.forEach(message => {
      expect(message.id).toBeDefined();
      expect(message.conversation_id).toEqual(conversationId);
      expect(message.role).toMatch(/^(user|assistant)$/);
      expect(message.content).toBeDefined();
      expect(message.created_at).toBeInstanceOf(Date);
    });
  });

  it('should return empty array for conversation with no messages', async () => {
    // Create conversation without messages
    const conversation = await db.insert(conversationsTable)
      .values({
        name: 'Empty Conversation'
      })
      .returning()
      .execute();

    const input: GetConversationMessagesInput = {
      conversation_id: conversation[0].id
    };

    const result = await getConversationMessages(input);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array for non-existent conversation', async () => {
    const input: GetConversationMessagesInput = {
      conversation_id: 999999
    };

    const result = await getConversationMessages(input);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should only return messages for the specified conversation', async () => {
    // Create two conversations
    const conversations = await db.insert(conversationsTable)
      .values([
        { name: 'Conversation 1' },
        { name: 'Conversation 2' }
      ])
      .returning()
      .execute();

    const conv1Id = conversations[0].id;
    const conv2Id = conversations[1].id;

    // Add messages to both conversations
    await db.insert(messagesTable)
      .values([
        {
          conversation_id: conv1Id,
          role: 'user',
          content: 'Message in conversation 1'
        },
        {
          conversation_id: conv2Id,
          role: 'user',
          content: 'Message in conversation 2'
        },
        {
          conversation_id: conv1Id,
          role: 'assistant',
          content: 'Another message in conversation 1'
        }
      ])
      .execute();

    const input: GetConversationMessagesInput = {
      conversation_id: conv1Id
    };

    const result = await getConversationMessages(input);

    // Should only return messages from conversation 1
    expect(result).toHaveLength(2);
    result.forEach(message => {
      expect(message.conversation_id).toEqual(conv1Id);
      expect(message.content).toMatch(/conversation 1/);
    });
  });
});
