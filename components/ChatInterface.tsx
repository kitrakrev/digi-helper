'use client';

import { useChat } from '@ai-sdk/react';
import { useRef, useEffect } from 'react';

export default function ChatInterface({ tenantId }: { tenantId: string }) {
  const chatConfig = useChat({
    api: '/api/chat',
    body: {
      tenantId,
    },
  } as any) as any;

  const { messages, input, handleInputChange, handleSubmit, status } = chatConfig;

  const isLoading = status === 'submitted' || status === 'streaming';
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full w-full min-h-[350px] max-h-[500px]">
      <div className="flex-1 overflow-y-auto mb-4 space-y-4 p-2 pr-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm flex-col gap-2 text-center">
            <p>Try asking: "Connect my Slack account", "Summarize my unread messages", or "Update my portfolio timeline!"</p>
          </div>
        ) : (
          messages.map((m: any) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-lg p-3 text-sm ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-muted text-foreground'}`}>
                <p className="whitespace-pre-wrap">{m.content || ((m as any).toolInvocations && (m as any).toolInvocations.length > 0 ? `[Running tool: ${(m as any).toolInvocations[0].toolName}...]` : '')}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={input}
          placeholder="Ask the Briefing Agent..."
          onChange={handleInputChange}
          disabled={isLoading}
        />
        <button 
          type="submit" 
          disabled={isLoading || !input || !input.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
