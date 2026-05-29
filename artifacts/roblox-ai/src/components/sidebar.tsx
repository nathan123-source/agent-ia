import {
  useListConversations,
  useGetConversationStats,
  useCreateConversation,
  useDeleteConversation,
  getListConversationsQueryKey,
} from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import {
  Plus,
  MessageSquare,
  Trash2,
  Settings,
  TerminalSquare,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQueryClient } from "@tanstack/react-query";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: conversations, isLoading } = useListConversations();
  const { data: stats } = useGetConversationStats();

  const createMutation = useCreateConversation({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        setLocation(`/chat/${data.id}`);
        onClose?.();
      },
    },
  });

  const deleteMutation = useDeleteConversation({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        setLocation("/");
      },
    },
  });

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <div
        className={`
          fixed md:relative z-40 md:z-auto
          top-0 left-0 h-full
          w-72 md:w-64
          bg-sidebar border-r border-sidebar-border
          flex flex-col
          text-sidebar-foreground
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 font-bold text-primary">
              <TerminalSquare className="w-5 h-5" />
              <span>RobloxAI</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 md:hidden text-muted-foreground"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <Button
            className="w-full justify-start gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => createMutation.mutate({ data: { title: "New Chat" } })}
            disabled={createMutation.isPending}
          >
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
        </div>

        {/* Conversation list */}
        <ScrollArea className="flex-1 p-2">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Carregando...
            </div>
          ) : conversations?.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhuma conversa ainda
            </div>
          ) : (
            <div className="space-y-0.5">
              {conversations?.map((conv) => {
                const isActive = location === `/chat/${conv.id}`;
                return (
                  <div
                    key={conv.id}
                    className={`group flex items-center justify-between rounded-md transition-colors
                      ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/60"}
                    `}
                  >
                    <Link
                      href={`/chat/${conv.id}`}
                      className="flex items-center gap-2 flex-1 truncate px-2 py-2 text-sm"
                      onClick={onClose}
                    >
                      <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="truncate">{conv.title}</span>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 mr-1 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate({ id: conv.id });
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t border-sidebar-border bg-sidebar-accent/30 text-xs text-muted-foreground space-y-1.5">
          <div className="grid grid-cols-3 gap-1 text-center">
            <div className="bg-background/40 rounded-md py-1.5">
              <div className="font-semibold text-foreground">{stats?.totalConversations ?? 0}</div>
              <div>Chats</div>
            </div>
            <div className="bg-background/40 rounded-md py-1.5">
              <div className="font-semibold text-foreground">{stats?.totalMessages ?? 0}</div>
              <div>Msgs</div>
            </div>
            <div className="bg-background/40 rounded-md py-1.5">
              <div className="font-semibold text-foreground">{stats?.totalScripts ?? 0}</div>
              <div>Scripts</div>
            </div>
          </div>
          <Link
            href="/settings"
            className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-sidebar-accent text-sidebar-foreground hover:text-primary transition-colors"
            onClick={onClose}
          >
            <Settings className="w-4 h-4" />
            <span className="font-medium">Configurações</span>
          </Link>
        </div>
      </div>
    </>
  );
}
