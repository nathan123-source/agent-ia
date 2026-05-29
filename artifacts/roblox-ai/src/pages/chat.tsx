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
  Send, Bot, User, Code2, Paperclip, Copy, Check, X,
  ChevronDown, ChevronRight, Menu, Zap, Shield, Eye,
  Gamepad2, Crosshair, Wand2, Image as ImageIcon,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

// ── Quick prompt templates shown on the home screen ──────────────────────────
const QUICK_PROMPTS = [
  { icon: Eye,       label: "ESP Completo",       prompt: "Faz um script completo de ESP com caixas, nomes, distância e tracers usando Drawing API" },
  { icon: Crosshair, label: "Silent Aim",          prompt: "Cria um silent aim script com configuração de FOV, smoothness e whitelist de partes do corpo" },
  { icon: Zap,       label: "Speed / Fly Hack",    prompt: "Script de speed hack, fly e infinite jump com toggle de tecla e configuração de velocidade" },
  { icon: Gamepad2,  label: "Auto Farm",           prompt: "Faz um autofarm genérico com pathfinding, coleta automática e anti-AFK" },
  { icon: Shield,    label: "Anti-Cheat Bypass",   prompt: "Script com estruturas de anti-detecção, hook de remotes e proteções contra anti-cheat" },
  { icon: Wand2,     label: "GUI do Zero",         prompt: "Cria uma GUI completa com janela arrastável, abas, botões com tween e toggle de tecla" },
  { icon: ImageIcon, label: "Copiar GUI da Foto",  prompt: "Analise a GUI na imagem que vou enviar e replique exatamente no Lua — mesmas cores, posições, botões e estilo" },
  { icon: Code2,     label: "Analisar Script",     prompt: "Vou colar um script, analise bugs, nil errors, memory leaks e me dê a versão corrigida" },
];

// ── Code block with copy button ───────────────────────────────────────────────
function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  const isLua = ["lua", "luau"].includes(language.toLowerCase());

  return (
    <div className="relative my-3 rounded-lg overflow-hidden border border-border/60 bg-[#1a1a2e]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#16213e] border-b border-border/40">
        <span className="text-xs font-mono text-primary/70 uppercase tracking-wider">{language}</span>
        <div className="flex items-center gap-1.5">
          {isLua && (
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/30">
              Lua Script
            </span>
          )}
          <Button
            size="sm" variant="ghost"
            className="h-6 px-2 text-xs hover:text-primary hover:bg-primary/10 gap-1"
            onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copiado!" : isLua ? "Copiar Script" : "Copiar"}
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto max-h-[600px]">
        <SyntaxHighlighter
          children={code} style={vscDarkPlus} language={language || "lua"} PreTag="div"
          customStyle={{ margin: 0, padding: "1rem", background: "transparent", fontSize: "0.82rem", lineHeight: "1.55" }}
        />
      </div>
    </div>
  );
}

// ── Collapsible think block ───────────────────────────────────────────────────
function ThinkBlock({ content }: { content: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="my-2 border border-border/40 rounded-lg overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground bg-muted/20 hover:bg-muted/40 transition-colors">
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <span>Raciocínio interno</span>
      </button>
      {open && (
        <div className="px-4 py-3 text-xs text-muted-foreground italic bg-muted/10 whitespace-pre-wrap leading-relaxed">
          {content}
        </div>
      )}
    </div>
  );
}

// ── Markdown message renderer ─────────────────────────────────────────────────
function MessageContent({ content }: { content: string }) {
  const parts: Array<{ type: "think" | "text"; content: string }> = [];
  const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
  let lastIndex = 0; let match;
  while ((match = thinkRegex.exec(content)) !== null) {
    if (match.index > lastIndex) parts.push({ type: "text", content: content.slice(lastIndex, match.index) });
    parts.push({ type: "think", content: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) parts.push({ type: "text", content: content.slice(lastIndex) });

  return (
    <div>
      {parts.map((p, i) =>
        p.type === "think" ? <ThinkBlock key={i} content={p.content} /> : (
          <ReactMarkdown key={i}
            className="prose prose-invert max-w-none break-words text-sm leading-relaxed"
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || "");
                const code = String(children).replace(/\n$/, "");
                return !inline && match
                  ? <CodeBlock code={code} language={match[1]} />
                  : <code {...props} className="bg-muted/60 px-1.5 py-0.5 rounded text-xs font-mono text-primary">{children}</code>;
              },
              pre({ children }) { return <>{children}</>; },
            }}
          >{p.content}</ReactMarkdown>
        )
      )}
    </div>
  );
}

// ── Scripts modal ─────────────────────────────────────────────────────────────
function ScriptsModal({ conversationId, onClose }: { conversationId: number; onClose: () => void }) {
  const { data: scripts, isLoading } = useExtractScripts(conversationId, {
    query: { enabled: true, queryKey: ["extractScripts", conversationId] },
  });
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-xl w-full sm:max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <h2 className="font-semibold flex items-center gap-2 text-sm"><Code2 className="w-4 h-4 text-primary" />Scripts Extraídos</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7"><X className="w-4 h-4" /></Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading && <p className="text-muted-foreground text-center py-8 text-sm">Extraindo scripts...</p>}
          {!isLoading && (!scripts || scripts.length === 0) && (
            <p className="text-muted-foreground text-center py-8 text-sm">Nenhum bloco de código encontrado.</p>
          )}
          {scripts?.map((script, i) => (
            <div key={i} className="border border-border/60 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-muted/20 border-b border-border/40">
                <span className="text-xs font-mono text-primary/70 uppercase">{script.language} — Script {i + 1}</span>
                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs gap-1"
                  onClick={() => { navigator.clipboard.writeText(script.code); setCopiedIdx(i); setTimeout(() => setCopiedIdx(null), 2000); }}>
                  {copiedIdx === i ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedIdx === i ? "Copiado!" : "Copiar"}
                </Button>
              </div>
              <div className="overflow-x-auto max-h-56">
                <SyntaxHighlighter children={script.code} style={vscDarkPlus} language={script.language} PreTag="div"
                  customStyle={{ margin: 0, padding: "0.75rem", background: "#1a1a2e", fontSize: "0.78rem" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Image preview for uploaded files ─────────────────────────────────────────
function ImagePreview({ fileUrl, fileName }: { fileUrl: string; fileName: string }) {
  const isImg = /\.(png|jpe?g|gif|webp)$/i.test(fileUrl);
  if (!isImg) return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1 mb-2 w-fit">
      <Paperclip className="w-3 h-3" />{fileName}
    </div>
  );
  return (
    <div className="mb-2">
      <img src={fileUrl} alt={fileName}
        className="max-w-[280px] max-h-48 rounded-lg border border-border/40 object-contain cursor-pointer hover:opacity-90 transition-opacity"
        onClick={() => window.open(fileUrl, "_blank")} />
      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><ImageIcon className="w-3 h-3" />{fileName}</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const id = params.id ? parseInt(params.id) : null;
  const { toast } = useToast();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showScripts, setShowScripts] = useState(false);
  const [input, setInput] = useState("");
  const [fileAttachment, setFileAttachment] = useState<{ url: string; name: string; isImage: boolean } | null>(null);

  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: conversation } = useGetConversation(id ?? 0, {
    query: { enabled: !!id, queryKey: getGetConversationQueryKey(id ?? 0) },
  });
  const { data: messages } = useListMessages(id ?? 0, {
    query: { enabled: !!id, queryKey: getListMessagesQueryKey(id ?? 0) },
  });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, id]);

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
        const msg = err?.response?.data?.error || err?.message || "Falha ao enviar";
        toast({ title: "Erro", description: msg, variant: "destructive" });
      },
    },
  });

  const doSend = useCallback(async (text: string) => {
    if (!text.trim()) return;
    const content = text.trim();
    setInput("");

    const sendPayload = (convId: number) => {
      sendMessageMutation.mutate({
        id: convId,
        data: {
          content,
          fileUrl: fileAttachment?.url ?? null,
          fileName: fileAttachment?.name ?? null,
        },
      });
    };

    if (!id) {
      try {
        const conv = await createConversation.mutateAsync({ data: {} });
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        setLocation(`/chat/${conv.id}`);
        setTimeout(() => sendPayload(conv.id), 120);
      } catch {
        toast({ title: "Erro", description: "Falha ao criar conversa", variant: "destructive" });
      }
      return;
    }
    sendPayload(id);
  }, [input, id, fileAttachment, createConversation, sendMessageMutation, setLocation, queryClient, toast]);

  const handleSend = () => doSend(input);

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 7 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 7MB", variant: "destructive" });
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/files/upload", { method: "POST", body: formData });
      const data = await res.json();
      const isImage = /image\//.test(file.type);
      setFileAttachment({ url: data.url, name: data.name, isImage });
      if (isImage) toast({ title: "Imagem anexada", description: "A IA vai analisar a imagem ao enviar." });
    } catch {
      toast({ title: "Falha no upload", description: "Não foi possível enviar o arquivo", variant: "destructive" });
    }
    e.target.value = "";
  };

  const isPending = sendMessageMutation.isPending || createConversation.isPending;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {showScripts && id && (
        <ScriptsModal conversationId={id} onClose={() => setShowScripts(false)} />
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header */}
        <header className="h-13 shrink-0 border-b border-border flex items-center gap-3 px-3 md:px-5 bg-card/80 backdrop-blur z-10">
          <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden shrink-0"
            onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          {/* Desktop logo */}
          <div className="hidden md:flex items-center gap-2 text-primary font-bold text-sm shrink-0 border-r border-border pr-4 mr-1">
            <Bot className="w-4 h-4" /> RobloxAI
          </div>
          <h1 className="font-semibold text-sm truncate flex-1">
            {id ? (conversation?.title || "Carregando...") : "RobloxAI Agent"}
          </h1>
          {id && (
            <Button variant="outline" size="sm"
              className="gap-1.5 border-primary/30 hover:bg-primary/10 text-primary text-xs shrink-0"
              onClick={() => setShowScripts(true)}>
              <Code2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Scripts</span>
            </Button>
          )}
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 md:px-6 py-5 space-y-5">
          {/* Home screen — no conversation selected */}
          {!id && (
            <div className="flex flex-col items-center justify-center min-h-full text-center px-4 pb-4">
              <div className="w-16 h-16 mb-5 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/10">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold mb-1">RobloxAI Agent</h2>
              <p className="text-muted-foreground text-sm mb-8 max-w-sm">
                Especialista em Lua, exploits, GUIs, ESP, aim assist e muito mais. Envie uma mensagem ou escolha um prompt abaixo.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full max-w-2xl">
                {QUICK_PROMPTS.map(({ icon: Icon, label, prompt }) => (
                  <button key={label} onClick={() => handleQuickPrompt(prompt)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/60 bg-card/60 hover:bg-primary/10 hover:border-primary/40 transition-all text-center group">
                    <Icon className="w-5 h-5 text-primary/70 group-hover:text-primary transition-colors" />
                    <span className="text-xs font-medium leading-tight">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty conversation */}
          {id && messages?.length === 0 && !isPending && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Bot className="w-10 h-10 mb-3 text-primary/30" />
              <p className="text-muted-foreground text-sm">Comece enviando uma mensagem.</p>
            </div>
          )}

          {/* Messages list */}
          {messages?.map((msg) => (
            <div key={msg.id}
              className={`flex gap-2.5 md:gap-3 max-w-4xl mx-auto w-full ${msg.role === "assistant" ? "" : "flex-row-reverse"}`}>
              <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5
                ${msg.role === "assistant" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {msg.role === "assistant" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div className={`flex-1 min-w-0 rounded-xl px-3 md:px-4 py-3
                ${msg.role === "assistant"
                  ? "bg-card/60 border border-border/40"
                  : "bg-primary/15 border border-primary/20 max-w-[85%] ml-auto"
                }`}>
                {(msg.fileUrl || msg.fileName) && (
                  <ImagePreview fileUrl={msg.fileUrl || ""} fileName={msg.fileName || "arquivo"} />
                )}
                {msg.role === "assistant"
                  ? <MessageContent content={msg.content} />
                  : <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                }
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isPending && (
            <div className="flex gap-2.5 max-w-4xl mx-auto w-full">
              <div className="shrink-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center mt-0.5">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="bg-card/60 border border-border/40 rounded-xl px-4 py-3 flex items-center gap-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
                <span className="text-xs text-muted-foreground ml-1">Gerando...</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-border bg-background px-3 md:px-5 pt-2 pb-3 md:pb-4">
          {fileAttachment && (
            <div className="max-w-4xl mx-auto mb-2 flex items-center gap-2">
              {fileAttachment.isImage ? (
                <div className="relative">
                  <img src={fileAttachment.url} alt={fileAttachment.name}
                    className="h-12 w-12 rounded-lg object-cover border border-border/60" />
                  <Button variant="ghost" size="icon"
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-destructive text-destructive-foreground rounded-full p-0 hover:bg-destructive/90"
                    onClick={() => setFileAttachment(null)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-1.5 border border-border/40">
                  <Paperclip className="w-3 h-3" />
                  <span className="truncate max-w-48">{fileAttachment.name}</span>
                  <Button variant="ghost" size="icon" className="h-4 w-4 ml-1"
                    onClick={() => setFileAttachment(null)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="max-w-4xl mx-auto flex items-end gap-2 bg-card border border-border/60 rounded-xl p-2
            focus-within:ring-1 focus-within:ring-primary/50 focus-within:border-primary/40 transition-all">
            <input ref={fileInputRef} type="file" className="hidden" accept="*/*" onChange={handleFileChange} />
            <Button variant="ghost" size="icon"
              className="shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={() => fileInputRef.current?.click()}>
              <Paperclip className="w-4 h-4" />
            </Button>
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Peça um script, exploit, GUI, ou mande uma foto..."
              className="min-h-[40px] max-h-44 border-0 focus-visible:ring-0 resize-none bg-transparent shadow-none text-sm py-2"
              rows={1}
            />
            <Button size="icon" onClick={handleSend}
              disabled={!input.trim() || isPending}
              className="shrink-0 h-9 w-9 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40">
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground/30 mt-1.5 hidden md:block">
            Enter para enviar · Shift+Enter nova linha · Anexos até 7MB · Imagens analisadas pela IA
          </p>
        </div>
      </div>
    </div>
  );
}
