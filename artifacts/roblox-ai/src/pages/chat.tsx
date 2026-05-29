import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { Sidebar } from "@/components/sidebar";
import { useGetConversation, useListMessages, useSendMessage, getListMessagesQueryKey, getGetConversationQueryKey, getListConversationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, User, Code2, Paperclip } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function ChatPage() {
  const params = useParams();
  const id = params.id ? parseInt(params.id) : null;
  
  const queryClient = useQueryClient();
  const { data: conversation } = useGetConversation(id || 0, { query: { enabled: !!id } });
  const { data: messages } = useListMessages(id || 0, { query: { enabled: !!id } });
  
  const [input, setInput] = useState("");
  
  const sendMessageMutation = useSendMessage({
    mutation: {
      onSuccess: () => {
        if (id) {
          queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getGetConversationQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        }
      }
    }
  });

  const handleSend = () => {
    if (!input.trim() || !id) return;
    sendMessageMutation.mutate({
      id,
      data: { content: input }
    });
    setInput("");
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-card text-card-foreground shadow-sm z-10">
          <h1 className="font-semibold text-lg">{conversation?.title || "Select a conversation"}</h1>
          <Button variant="outline" size="sm" className="gap-2 border-primary/20 hover:bg-primary/10 text-primary">
            <Code2 className="w-4 h-4" />
            Extract Scripts
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Bot className="w-16 h-16 mb-4 text-primary/50" />
              <p className="text-lg">How can I assist your script development today?</p>
            </div>
          ) : (
            messages?.map(msg => (
              <div key={msg.id} className={`flex gap-4 max-w-4xl mx-auto ${msg.role === 'assistant' ? '' : 'flex-row-reverse'}`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'assistant' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {msg.role === 'assistant' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </div>
                <div className={`p-4 rounded-lg overflow-hidden ${msg.role === 'assistant' ? 'bg-card border border-border shadow-sm w-full' : 'bg-secondary text-secondary-foreground max-w-[80%]'}`}>
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown
                      className="prose prose-invert max-w-none break-words"
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({node, inline, className, children, ...props}: any) {
                          const match = /language-(\w+)/.exec(className || '')
                          return !inline && match ? (
                            <div className="relative group mt-4 mb-4 rounded-md overflow-hidden border border-border bg-[#1e1e1e]">
                              <div className="flex items-center justify-between px-4 py-1 bg-[#2d2d2d] text-xs text-muted-foreground border-b border-border">
                                <span>{match[1]}</span>
                                <Button size="sm" variant="ghost" className="h-6 text-xs hover:text-primary">Copy Code</Button>
                              </div>
                              <SyntaxHighlighter
                                {...props}
                                children={String(children).replace(/\n$/, '')}
                                style={vscDarkPlus}
                                language={match[1]}
                                PreTag="div"
                                customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}
                              />
                            </div>
                          ) : (
                            <code {...props} className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-primary">
                              {children}
                            </code>
                          )
                        }
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  )}
                </div>
              </div>
            ))
          )}
          {sendMessageMutation.isPending && (
            <div className="flex gap-4 max-w-4xl mx-auto">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                <Bot className="w-5 h-5" />
              </div>
              <div className="flex items-center p-4 bg-card border border-border rounded-lg shadow-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce"></div>
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-background border-t border-border">
          <div className="max-w-4xl mx-auto relative flex items-end gap-2 bg-input border border-border rounded-xl p-2 focus-within:ring-1 focus-within:ring-ring focus-within:border-ring transition-all">
            <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground h-10 w-10">
              <Paperclip className="w-5 h-5" />
            </Button>
            <Textarea 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about Lua or exploit scripting..."
              className="min-h-[40px] max-h-64 border-0 focus-visible:ring-0 resize-none bg-transparent shadow-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button 
              size="icon" 
              onClick={handleSend}
              disabled={!input.trim() || !id || sendMessageMutation.isPending}
              className="shrink-0 h-10 w-10 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}