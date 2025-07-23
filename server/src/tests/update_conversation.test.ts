
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { conversationsTable } from '../db/schema';
import { type UpdateConversationInput } from '../schema';
import { updateConversation } from '../handlers/update_conversation';
import { eq } from 'drizzle-orm';

// Test input
const testUpdateInput: UpdateConversationInput = {
  id: 1, // Will be updated with actual ID
  name: 'Updated Conversation Name'
};

describe('updateConversation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update conversation name', async () => {
    // Create initial conversation directly in database
    const createResult = await db.insert(conversationsTable)
      .values({
        name: 'Original Conversation'
      })
      .returning()
      .execute();
    
    const created = createResult[0];
    
    // Update the conversation
    const updateInput = { ...testUpdateInput, id: created.id };
    const result = await updateConversation(updateInput);

    // Validate updated fields
    expect(result.id).toEqual(created.id);
    expect(result.name).toEqual('Updated Conversation Name');
    expect(result.created_at).toEqual(created.created_at);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(created.updated_at.getTime());
  });

  it('should save updated conversation to database', async () => {
    // Create initial conversation directly in database
    const createResult = await db.insert(conversationsTable)
      .values({
        name: 'Original Conversation'
      })
      .returning()
      .execute();
    
    const created = createResult[0];
    
    // Update the conversation
    const updateInput = { ...testUpdateInput, id: created.id };
    const result = await updateConversation(updateInput);

    // Query database to verify update
    const conversations = await db.select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, result.id))
      .execute();

    expect(conversations).toHaveLength(1);
    expect(conversations[0].name).toEqual('Updated Conversation Name');
    expect(conversations[0].updated_at).toBeInstanceOf(Date);
    expect(conversations[0].updated_at.getTime()).toBeGreaterThan(created.updated_at.getTime());
  });

  it('should throw error for non-existent conversation', async () => {
    const updateInput = { ...testUpdateInput, id: 999 };
    
    await expect(updateConversation(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should preserve created_at timestamp', async () => {
    // Create initial conversation directly in database
    const createResult = await db.insert(conversationsTable)
      .values({
        name: 'Original Conversation'
      })
      .returning()
      .execute();
    
    const created = createResult[0];
    
    // Wait a small amount to ensure timestamps differ
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Update the conversation
    const updateInput = { ...testUpdateInput, id: created.id };
    const result = await updateConversation(updateInput);

    // Verify created_at is unchanged
    expect(result.created_at.getTime()).toEqual(created.created_at.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThan(created.created_at.getTime());
  });
});
