import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Sparkles, Trash2 } from 'lucide-react';
import { chatAPI, ChatResponse } from '../api';
import { ScrollArea } from './ui/scroll-area';

const CHAT_STORAGE_KEY = 'ai_chat_history';
const MAX_INPUT_CHARS = 2000;

/**
 * AIAssistant Component
 * 
 * A beautiful, floating AI chat assistant powered by Groq via FastAPI backend.
 * 
 * Features:
 * - Floating Action Button (FAB) in bottom-right corner when collapsed
 * - Expands to full chat panel with purple gradient header
 * - Multi-turn conversation with persistent history
 * - Loading states with animated bouncing dots
 * - Suggested questions when chat is empty
 * - Fully responsive (mobile & desktop)
 * - Matches TrackFinance design system (purple gradients, rounded-2xl, Inter font)
 * 
 * Backend Integration:
 * - POST /api/v1/chat/chat - Send messages and get responses
 * - GET /api/v1/chat/chat/suggestions - Get suggested questions
 */

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface StoredMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const loadStoredMessages = (): Message[] => {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [];
    const parsed: StoredMessage[] = JSON.parse(raw);
    return parsed.map((m) => ({
      role: m.role,
      content: m.content,
      timestamp: new Date(m.timestamp),
    }));
  } catch {
    return [];
  }
};

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => loadStoredMessages());
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    try {
      if (messages.length === 0) {
        localStorage.removeItem(CHAT_STORAGE_KEY);
      } else {
        const serialized: StoredMessage[] = messages.map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp.toISOString(),
        }));
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(serialized));
      }
    } catch (error) {
      console.error('Failed to persist chat history:', error);
    }
  }, [messages]);

  // Load suggestions when chat opens
  useEffect(() => {
    if (isOpen && suggestions.length === 0) {
      loadSuggestions();
    }
  }, [isOpen]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle Escape key to close chat
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const loadSuggestions = async () => {
    try {
      const data = await chatAPI.getSuggestions();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
      // Fallback suggestions
      setSuggestions([
        "What's my spending this month?",
        "How can I save more money?",
        "Show my budget status",
      ]);
    }
  };

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const response: ChatResponse = await chatAPI.sendMessage(messageText, conversationHistory);

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Failed to send message:', error);
      const isNetwork = !error?.response;
      const errorMessage: Message = {
        role: 'assistant',
        content: isNetwork
          ? "I can't reach the server. Check your connection and try again."
          : "Something went wrong on my end. Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearConversation = () => {
    setMessages([]);
    try {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 flex items-center justify-center z-50 ring-1 ring-border"
          aria-label="Open AI Assistant"
        >
          <Sparkles size={24} />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div
          className="fixed bottom-8 right-8 w-[420px] h-[600px] bg-card rounded-2xl shadow-2xl flex flex-col z-50 border border-border overflow-hidden max-sm:w-[calc(100vw-2rem)] max-sm:h-[calc(100vh-2rem)] max-sm:bottom-4 max-sm:right-4 max-sm:left-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-card">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-secondary">
                <Sparkles size={16} className="text-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground tracking-tight">AI Assistant</h3>
                <p className="text-xs text-muted-foreground">Powered by Groq</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clearConversation}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Clear conversation"
                  title="Clear conversation"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button
                onClick={toggleChat}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close chat"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 min-h-0 p-4" ref={scrollAreaRef}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mb-4">
                  <Sparkles size={24} className="text-foreground" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">
                  Hi! I'm your AI finance assistant
                </h4>
                <p className="text-sm text-muted-foreground mb-6">
                  I can help you track spending, analyze budgets, and answer questions about your finances.
                </p>
                {suggestions.length > 0 && (
                  <div className="space-y-2 w-full">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-3">
                      Try asking:
                    </p>
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full px-4 py-3 bg-card hover:bg-accent border border-border hover:border-primary/50 text-foreground rounded-lg text-sm text-left transition-all duration-200"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] px-4 py-2.5 rounded-2xl ${message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground border border-border/50'
                        }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 px-1">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-secondary border border-border/50 px-4 py-3 rounded-2xl">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t border-border bg-card">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask me anything..."
                disabled={isLoading}
                maxLength={MAX_INPUT_CHARS}
                className="flex-1 px-4 py-2.5 bg-input border border-border text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="w-10 h-10 bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-sm"
                aria-label="Send message"
              >
                <Send size={16} className={isLoading ? "animate-pulse" : ""} />
              </button>
            </form>
            {inputValue.length > 1500 && (
              <p className={`text-xs mt-1 text-right ${inputValue.length > 1900 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {inputValue.length} / {MAX_INPUT_CHARS}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
