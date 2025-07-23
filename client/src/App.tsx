
import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { trpc } from '@/utils/trpc';
import { Plus, MessageSquare, Edit2, Trash2, Send, User, Bot } from 'lucide-react';
import type { Conversation, Message } from '../../server/src/schema';

function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  
  // Dialog states
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [editingConversation, setEditingConversation] = useState<Conversation | null>(null);
  const [renameInput, setRenameInput] = useState('');

  // Auto-scroll ref
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations on mount
  const loadConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getConversations.query();
      
      // If we have no conversations at all, create a default one
      if (result.length === 0) {
        const defaultConversation = await trpc.createConversation.mutate({ name: 'New Chat' });
        setConversations([defaultConversation]);
        setCurrentConversation(defaultConversation);
      } else {
        setConversations(result);
        // If no current conversation but we have conversations, select the first one
        if (!currentConversation) {
          setCurrentConversation(result[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentConversation]);

  // Load messages for current conversation
  const loadMessages = useCallback(async () => {
    if (!currentConversation) return;
    
    try {
      const result = await trpc.getConversationMessages.query({ 
        conversation_id: currentConversation.id 
      });
      setMessages(result);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }, [currentConversation]);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle new chat button click
  const handleNewChatClick = async () => {
    try {
      const newConversation = await trpc.createConversation.mutate({ 
        name: 'New Chat' 
      });
      setConversations(prev => [newConversation, ...prev]);
      setCurrentConversation(newConversation);
      setMessages([]);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  // Rename conversation
  const handleRenameConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConversation || !renameInput.trim()) return;

    try {
      const updatedConversation = await trpc.updateConversation.mutate({
        id: editingConversation.id,
        name: renameInput.trim()
      });
      
      setConversations(prev => 
        prev.map(conv => conv.id === editingConversation.id ? updatedConversation : conv)
      );
      
      if (currentConversation?.id === editingConversation.id) {
        setCurrentConversation(updatedConversation);
      }
      
      setIsRenameDialogOpen(false);
      setEditingConversation(null);
      setRenameInput('');
    } catch (error) {
      console.error('Failed to rename conversation:', error);
    }
  };

  // Delete conversation
  const handleDeleteConversation = async (conversationToDelete: Conversation) => {
    try {
      await trpc.deleteConversation.mutate({ id: conversationToDelete.id });
      
      const updatedConversations = conversations.filter(conv => conv.id !== conversationToDelete.id);
      setConversations(updatedConversations);
      
      // If we deleted the current conversation, switch to another one or create new
      if (currentConversation?.id === conversationToDelete.id) {
        if (updatedConversations.length > 0) {
          setCurrentConversation(updatedConversations[0]);
        } else {
          // Create a new default conversation
          const defaultConversation = await trpc.createConversation.mutate({ name: 'New Chat' });
          setConversations([defaultConversation]);
          setCurrentConversation(defaultConversation);
        }
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !currentConversation || isSendingMessage) return;

    const messageContent = messageInput.trim();
    const isFirstMessage = currentConversation.name === 'New Chat' && messages.length === 0;
    setMessageInput('');
    setIsSendingMessage(true);

    try {
      const response = await trpc.sendMessage.mutate({
        conversation_id: currentConversation.id,
        content: messageContent
      });

      // Add both user and assistant messages to the UI
      setMessages(prev => [...prev, response.user_message, response.assistant_message]);
      
      // Auto-name the conversation if it's the first message in a "New Chat"
      if (isFirstMessage) {
        const autoGeneratedName = messageContent.substring(0, 50) + (messageContent.length > 50 ? '...' : '');
        
        try {
          const updatedConversation = await trpc.updateConversation.mutate({
            id: currentConversation.id,
            name: autoGeneratedName
          });
          
          // Update conversations state and current conversation
          setConversations(prev => 
            prev.map(conv => 
              conv.id === currentConversation.id 
                ? { ...updatedConversation, updated_at: new Date() }
                : conv
            ).sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime())
          );
          
          setCurrentConversation(updatedConversation);
        } catch (nameError) {
          console.error('Failed to auto-name conversation:', nameError);
          // Still update the conversation's updated_at time even if naming failed
          setConversations(prev => 
            prev.map(conv => 
              conv.id === currentConversation.id 
                ? { ...conv, updated_at: new Date() }
                : conv
            ).sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime())
          );
        }
      } else {
        // Update the conversation's updated_at time
        setConversations(prev => 
          prev.map(conv => 
            conv.id === currentConversation.id 
              ? { ...conv, updated_at: new Date() }
              : conv
          ).sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime())
        );
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Switch conversation
  const handleConversationClick = (conversation: Conversation) => {
    setCurrentConversation(conversation);
  };

  // Open rename dialog
  const openRenameDialog = (conversation: Conversation) => {
    setEditingConversation(conversation);
    setRenameInput(conversation.name);
    setIsRenameDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <Button 
            className="w-full justify-start" 
            variant="outline"
            onClick={handleNewChatClick}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations.map((conversation: Conversation) => (
              <div
                key={conversation.id}
                className={`group flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                  currentConversation?.id === conversation.id
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => handleConversationClick(conversation)}
              >
                <MessageSquare className="w-4 h-4 mr-3 text-gray-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {conversation.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {conversation.updated_at.toLocaleDateString()}
                  </p>
                </div>
                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      openRenameDialog(conversation);
                    }}
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{conversation.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteConversation(conversation)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {currentConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">
                {currentConversation.name}
              </h2>
              <p className="text-sm text-gray-500">
                Created {currentConversation.created_at.toLocaleDateString()}
              </p>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4">
              <div className="max-w-4xl mx-auto space-y-6">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <Bot className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Start a conversation
                    </h3>
                    <p className="text-gray-500">
                      Send your first message to begin chatting.
                    </p>
                  </div>
                ) : (
                  messages.map((message: Message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`flex max-w-[80%] ${
                          message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                        }`}
                      >
                        <Avatar className="w-8 h-8 mx-3">
                          <AvatarFallback className={
                            message.role === 'user' 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-green-600 text-white'
                          }>
                            {message.role === 'user' ? (
                              <User className="w-4 h-4" />
                            ) : (
                              <Bot className="w-4 h-4" />
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <Card className={`${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border-gray-200'
                        }`}>
                          <CardContent className="p-4">
                            <div className="prose prose-sm max-w-none">
                              <p className="whitespace-pre-wrap break-words m-0">
                                {message.content}
                              </p>
                            </div>
                            <p className={`text-xs mt-2 ${
                              message.role === 'user' 
                                ? 'text-blue-100' 
                                : 'text-gray-500'
                            }`}>
                              {message.created_at.toLocaleTimeString()}
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <Textarea
                      value={messageInput}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                        setMessageInput(e.target.value)
                      }
                      placeholder="Type your message..."
                      className="resize-none min-h-[50px] max-h-32"
                      onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e as React.FormEvent);
                        }
                      }}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={!messageInput.trim() || isSendingMessage}
                    className="self-end"
                  >
                    {isSendingMessage ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No conversation selected
              </h3>
              <p className="text-gray-500">
                Select a conversation from the sidebar to start chatting.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Rename Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Conversation</DialogTitle>
            <DialogDescription>
              Enter a new name for this conversation.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRenameConversation}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="rename-input">Conversation Name</Label>
                <Input
                  id="rename-input"
                  value={renameInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setRenameInput(e.target.value)
                  }
                  placeholder="Enter new name..."
                  required
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRenameDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!renameInput.trim()}>
                Rename
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
