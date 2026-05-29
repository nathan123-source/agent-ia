import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { Sidebar } from "@/components/sidebar";
import {
  useGetConversation,
  useListMessages,
  useSendMessage,
  useCreateConversation,
  useExtractScripts,
  getListMessagesQueryKey,
  getGetConversationQueryKey,
  getListConversationsQueryKey,
  getGetConversationStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Send,
  Bot,
  User,
  Code2,
  Paperclip,
  Copy,
  Check,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  const isLua = ["lua", "luau"].includes(language.toLowerCase());

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4 rounded-lg overflow-hidden border border-border/60 bg-[#1a1a2e]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#16213e] border-b border-border/40">
        <span className="text-xs font-mono text-primary/70 uppercase tracking-wider">{language}</span>
        <div className="flex gap-2">
          {isLua && (
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/30">
              Lua Script
            </span>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs hover:text-primary hover:bg-primary/10 gap-1"
            onClick={handleCopy}
            data-testid="button-copy-code"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied!" : isLua ? "Copy Script" : "Copy"}
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          children={code}
          style={vscDarkPlus}
          language={language || "lua"}
          PreTag="div"
          customStyle={{
            margin: 0,
            padding: "1rem",
            background: "transparent",
            fontSize: "0.85rem",
            lineHeight: "1.5",
          }}
        />
      </div>
    </div>
  );
}

function ThinkBlock({ content }: { content: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="my-3 border border-border/40 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <span>Thinking...</span>
      </button>
      {open && (
        <div className="px-4 py-3 text-sm text-muted-foreground italic bg-muted/10 whitespace-pre-wrap">
          {content}
        </div>
      )}
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  // Parse out <think> blocks
  const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
  const parts: Array<{ type: "think" | "text"; content: string }> = [];
  let lastIndex = 0;
  let match;

  while ((match = thinkRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: "think", content: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push({ type: "text", content: content.slice(lastIndex) });
  }

  return (
    <div>
      {parts.map((part, i) =>
        part.type === "think" ? (
          <ThinkBlock key={i} content={part.content} />
        ) : (
          <ReactMarkdown
            key={i}
            className="prose prose-invert max-w-none break-words text-sm leading-relaxed"
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || "");
                const code = String(children).replace(/\n$/, "");
                return !inline && match ? (
                  <CodeBlock code={code} language={match[1]} />
                ) : (
                  <code
                    {...props}
                    className="bg-muted/60 px-1.5 py-0.5 rounded text-xs font-mono text-primary"
                  >
                    {children}
                  </code>
                );
              },
              pre({ children }) {
                return <>{children}</>;
              },
            }}
          >
            {part.content}
          </ReactMarkdown>
        )
      )}
    </div>
  );
}

function ScriptsModal({
  conversationId,
  onClose,
}: {
  conversationId: number;
  onClose: () => void;
}) {
  const { data: scripts, isLoading } = useExtractScripts(conversationId, {
    query: { enabled: true, queryKey: ["extractScripts", conversationId] },
  });
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleCopy = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Code2 className="w-5 h-5 text-primary" />
            Extracted Scripts
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading && (
            <p className="text-muted-foreground text-center py-8">Extracting scripts...</p>
          )}
          {!isLoading && (!scripts || scripts.length === 0) && (
            <p className="text-muted-foreground text-center py-8">
              No code blocks found in this conversation.
            </p>
          )}
          {scripts?.map((script, i) => (
            <div key={i} className="border border-border/60 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-muted/20 border-b border-border/40">
                <span className="text-xs font-mono text-primary/70 uppercase">
                  {script.language} — Script {i + 1}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs gap-1"
                  onClick={() => handleCopy(script.code, i)}
                >
                  {copiedIdx === i ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  {copiedIdx === i ? "Copied!" : "Copy Script"}
                </Button>
              </div>
              <div className="overflow-x-auto max-h-64">
                <SyntaxHighlighter
                  children={script.code}
                  style={vscDarkPlus}
                  language={script.language}
                  PreTag="div"
                  customStyle={{ margin: 0, padding: "1rem", background: "#1a1a2e", fontSize: "0.8rem" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const id = params.id ? parseInt(params.id) : null;
  const { toast } = useToast();

  const queryClient = useQueryClient();
  const { data: conversation } = useGetConversation(id ?? 0, {
    query: { enabled: !!id, queryKey: getGetConversationQueryKey(id ?? 0) },
  });
  const { data: messages } = useListMessages(id ?? 0, {
    query: { enabled: !!id, queryKey: getListMessagesQueryKey(id ?? 0) },
  });

  const [input, setInput] = useState("");
  const [showScripts, setShowScripts] = useState(false);
  const [fileAttachment, setFileAttachment] = useState<{ url: string; name: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, id]);

  const createConversation = useCreateConversation();

  const sendMessageMutation = useSendMessage({
    mutation: {
      onSuccess: () => {
        if (id) {
          queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getGetConversationQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetConversationStatsQueryKey() });
        }
        setFileAttachment(null);
      },
      onError: (err: any) => {
        const msg =
          err?.response?.data?.error ||
          err?.message ||
          "Failed to send message";
        const isRateLimit =
          msg.includes("rate_limit") ||
          msg.includes("Rate limit") ||
          msg.includes("429");
        toast({
          title: isRateLimit ? "Groq Rate Limit Reached" : "Send Failed",
          description: isRateLimit
            ? "Daily token limit reached. Please wait ~1h or upgrade your Groq plan at console.groq.com/settings/billing"
            : msg,
          variant: "destructive",
        });
      },
    },
  });

  const handleSend = useCallback(async () => {
    if (!input.trim()) return;

    const content = input.trim();
    setInput("");

    // If no conversation, create one first
    if (!id) {
      try {
        const conv = await createConversation.mutateAsync({ data: {} });
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        // Navigate to the new conversation
        setLocation(`/chat/${conv.id}`);
        // Send the message after navigation
        setTimeout(() => {
          sendMessageMutation.mutate({
            id: conv.id,
            data: {
              content,
              fileUrl: fileAttachment?.url ?? null,
              fileName: fileAttachment?.name ?? null,
            },
          });
        }, 100);
      } catch {
        toast({ title: "Error", description: "Failed to create conversation", variant: "destructive" });
      }
      return;
    }

    sendMessageMutation.mutate({
      id,
      data: {
        content,
        fileUrl: fileAttachment?.url ?? null,
        fileName: fileAttachment?.name ?? null,
      },
    });
  }, [input, id, fileAttachment, createConversation, sendMessageMutation, setLocation, queryClient, toast]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 7 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max file size is 7MB", variant: "destructive" });
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/files/upload", { method: "POST", body: formData });
      const data = await res.json();
      setFileAttachment({ url: data.url, name: data.name });
    } catch {
      toast({ title: "Upload failed", description: "Could not upload file", variant: "destructive" });
    }
    e.target.value = "";
  };

  const isPending = sendMessageMutation.isPending || createConversation.isPending;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />

      {showScripts && id && (
        <ScriptsModal conversationId={id} onClose={() => setShowScripts(false)} />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b border-border flex items-center justify-between px-4 md:px-6 bg-card/80 backdrop-blur text-card-foreground z-10 shrink-0">
          <h1 className="font-semibold text-base truncate max-w-[60%]">
            {id ? (conversation?.title || "Loading...") : "RobloxAI Agent"}
          </h1>
          {id && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-primary/30 hover:bg-primary/10 text-primary text-xs"
              onClick={() => setShowScripts(true)}
              data-testid="button-extract-scripts"
            >
              <Code2 className="w-3.5 h-3.5" />
              Extract Scripts
            </Button>
          )}
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6" data-testid="messages-container">
          {!id && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-16 h-16 mb-6 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">RobloxAI Agent</h2>
              <p className="text-muted-foreground text-sm max-w-sm">
                Especialista em scripts Lua, exploits, GUIs, ESP, aim assist e sistemas de combat para Roblox.
                Comece digitando sua mensagem abaixo.
              </p>
            </div>
          )}

          {id && messages?.length === 0 && !isPending && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <Bot className="w-10 h-10 mb-3 text-primary/40" />
              <p className="text-muted-foreground text-sm">
                Comece a conversa enviando uma mensagem.
              </p>
            </div>
          )}

          {messages?.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-4xl mx-auto w-full ${
                msg.role === "assistant" ? "" : "flex-row-reverse"
              }`}
              data-testid={`message-${msg.id}`}
            >
              <div
                className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-1 ${
                  msg.role === "assistant"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {msg.role === "assistant" ? (
                  <Bot className="w-4 h-4" />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>

              <div
                className={`flex-1 min-w-0 rounded-xl px-4 py-3 ${
                  msg.role === "assistant"
                    ? "bg-card/60 border border-border/40"
                    : "bg-primary/15 border border-primary/20 max-w-[85%] ml-auto"
                }`}
              >
                {msg.fileName && (
                  <div className="mb-2 text-xs text-muted-foreground flex items-center gap-1">
                    <Paperclip className="w-3 h-3" />
                    {msg.fileName}
                  </div>
                )}
                {msg.role === "assistant" ? (
                  <MessageContent content={msg.content} />
                ) : (
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isPending && (
            <div className="flex gap-3 max-w-4xl mx-auto w-full">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center mt-1">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="bg-card/60 border border-border/40 rounded-xl px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full bg-primary animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">Gerando script...</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="shrink-0 p-3 md:p-4 border-t border-border bg-background">
          {fileAttachment && (
            <div className="max-w-4xl mx-auto mb-2 flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 border border-border/40">
              <Paperclip className="w-3 h-3 shrink-0" />
              <span className="truncate">{fileAttachment.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 ml-auto shrink-0"
                onClick={() => setFileAttachment(null)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}

          <div className="max-w-4xl mx-auto flex items-end gap-2 bg-card border border-border/60 rounded-xl p-2 focus-within:ring-1 focus-within:ring-primary/50 focus-within:border-primary/40 transition-all shadow-lg">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="*/*"
              onChange={handleFileChange}
            />
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-foreground h-9 w-9"
              onClick={() => fileInputRef.current?.click()}
              data-testid="button-attach-file"
            >
              <Paperclip className="w-4 h-4" />
            </Button>

            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Peça um script, exploit, GUI... Shift+Enter para nova linha"
              className="min-h-[40px] max-h-52 border-0 focus-visible:ring-0 resize-none bg-transparent shadow-none text-sm py-2"
              data-testid="input-message"
              rows={1}
            />

            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isPending}
              className="shrink-0 h-9 w-9 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
              data-testid="button-send"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground/40 mt-2 hidden md:block">
            Enter para enviar · Shift+Enter para nova linha · Anexos até 7MB
          </p>
        </div>
      </div>
    </div>
  );
}
