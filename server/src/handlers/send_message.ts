
import { db } from '../db';
import { conversationsTable, messagesTable } from '../db/schema';
import { type SendMessageInput, type SendMessageResponse } from '../schema';
import { eq } from 'drizzle-orm';

export const sendMessage = async (input: SendMessageInput): Promise<SendMessageResponse> => {
  try {
    // 1. Verify conversation exists
    const conversation = await db.select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, input.conversation_id))
      .execute();
    
    if (conversation.length === 0) {
      throw new Error(`Conversation with id ${input.conversation_id} not found`);
    }

    // 2. Create and save the user message
    const userMessageResult = await db.insert(messagesTable)
      .values({
        conversation_id: input.conversation_id,
        role: 'user',
        content: input.content
      })
      .returning()
      .execute();

    const userMessage = userMessageResult[0];

    // 3. Get conversation context (all previous messages)
    const conversationMessages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.conversation_id, input.conversation_id))
      .orderBy(messagesTable.created_at)
      .execute();

    // 4. Generate LLM response (placeholder - would integrate with external LLM service)
    let llmResponse = `This is a mock LLM response to: "${input.content}". (Context: ${conversationMessages.length} previous messages).`;
    const lowerContent = input.content.toLowerCase();

    if (lowerContent.includes('hello') || lowerContent.includes('hi')) {
      llmResponse = `Hello there! This is a mock response. How can I assist you today? (Context: ${conversationMessages.length} previous messages).`;
    } else if (lowerContent.includes('time')) {
      llmResponse = `The current mock time is ${new Date().toLocaleTimeString()}. (Context: ${conversationMessages.length} previous messages).`;
    } else if (lowerContent.includes('weather')) {
      llmResponse = `I'm just a mock LLM, but I can tell you the weather is probably lovely wherever you are! (Context: ${conversationMessages.length} previous messages).`;
    } else if (lowerContent.includes('your name')) {
      llmResponse = `I am a mock LLM. You can call me Mock-GPT! (Context: ${conversationMessages.length} previous messages).`;
    }

    // 5. Create and save the assistant message
    const assistantMessageResult = await db.insert(messagesTable)
      .values({
        conversation_id: input.conversation_id,
        role: 'assistant',
        content: llmResponse
      })
      .returning()
      .execute();

    const assistantMessage = assistantMessageResult[0];

    // 6. Update the conversation's updated_at timestamp
    await db.update(conversationsTable)
      .set({ updated_at: new Date() })
      .where(eq(conversationsTable.id, input.conversation_id))
      .execute();

    // 7. Return both messages
    return {
      user_message: userMessage,
      assistant_message: assistantMessage
    };
  } catch (error) {
    console.error('Send message failed:', error);
    throw error;
  }
};
