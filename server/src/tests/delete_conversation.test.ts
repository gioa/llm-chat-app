
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { conversationsTable, messagesTable } from '../db/schema';
import { type DeleteConversationInput, type CreateConversationInput, type CreateMessageInput } from '../schema';
import { deleteConversation } from '../handlers/delete_conversation';
import { eq } from 'drizzle-orm';

// Test input
const testInput: DeleteConversationInput = {
  id: 1
};

// Helper to create a test conversation
const createTestConversation = async (): Promise<number> => {
  const result = await db.insert(conversationsTable)
    .values({
      name: 'Test Conversation'
    })
    .returning()
    .execute();
  
  return result[0].id;
};

// Helper to create a test message
const createTestMessage = async (conversationId: number): Promise<void> => {
  await db.insert(messagesTable)
    .values({
      conversation_id: conversationId,
      role: 'user',
      content: 'Test message'
    })
    .execute();
};

describe('deleteConversation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a conversation', async () => {
    // Create test conversation
    const conversationId = await createTestConversation();

    const result = await deleteConversation({ id: conversationId });

    expect(result.success).toBe(true);

    // Verify conversation was deleted
    const conversations = await db.select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, conversationId))
      .execute();

    expect(conversations).toHaveLength(0);
  });

  it('should cascade delete associated messages', async () => {
    // Create test conversation and message
    const conversationId = await createTestConversation();
    await createTestMessage(conversationId);

    // Verify message exists before deletion
    const messagesBefore = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.conversation_id, conversationId))
      .execute();

    expect(messagesBefore).toHaveLength(1);

    // Delete conversation
    const result = await deleteConversation({ id: conversationId });

    expect(result.success).toBe(true);

    // Verify messages were cascade deleted
    const messagesAfter = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.conversation_id, conversationId))
      .execute();

    expect(messagesAfter).toHaveLength(0);
  });

  it('should handle deletion of non-existent conversation', async () => {
    const result = await deleteConversation({ id: 999 });

    expect(result.success).toBe(true);
  });

  it('should delete multiple messages when conversation has many', async () => {
    // Create test conversation
    const conversationId = await createTestConversation();

    // Create multiple messages
    await createTestMessage(conversationId);
    await db.insert(messagesTable)
      .values({
        conversation_id: conversationId,
        role: 'assistant',
        content: 'Assistant response'
      })
      .execute();
    await db.insert(messagesTable)
      .values({
        conversation_id: conversationId,
        role: 'user',
        content: 'Another user message'
      })
      .execute();

    // Verify multiple messages exist
    const messagesBefore = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.conversation_id, conversationId))
      .execute();

    expect(messagesBefore).toHaveLength(3);

    // Delete conversation
    const result = await deleteConversation({ id: conversationId });

    expect(result.success).toBe(true);

    // Verify all messages were cascade deleted
    const messagesAfter = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.conversation_id, conversationId))
      .execute();

    expect(messagesAfter).toHaveLength(0);
  });
});
