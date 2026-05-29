import { useListConversations, useGetConversationStats, useCreateConversation, useDeleteConversation, getListConversationsQueryKey } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Plus, MessageSquare, Trash2, Settings, TerminalSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQueryClient } from "@tanstack/react-query";

export function Sidebar() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: conversations, isLoading } = useListConversations();
  const { data: stats } = useGetConversationStats();
  
  const createMutation = useCreateConversation({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        setLocation(`/chat/${data.id}`);
      }
    }
  });

  const deleteMutation = useDeleteConversation({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        setLocation('/');
      }
    }
  });

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col h-screen text-sidebar-foreground">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2 mb-4 font-bold text-primary">
          <TerminalSquare className="w-5 h-5" />
          <span>RobloxAI</span>
        </div>
        <Button 
          className="w-full justify-start gap-2 bg-primary text-primary-foreground hover:bg-primary/90" 
          onClick={() => createMutation.mutate({ data: { title: "New Chat" } })}
        >
          <Plus className="w-4 h-4" />
          New Chat
        </Button>
      </div>

      <ScrollArea className="flex-1 p-2">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-1">
            {conversations?.map(conv => (
              <div key={conv.id} className="group flex items-center justify-between p-2 rounded-md hover:bg-sidebar-accent cursor-pointer">
                <Link href={`/chat/${conv.id}`} className="flex items-center gap-2 flex-1 truncate">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  <span className="truncate text-sm">{conv.title}</span>
                </Link>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMutation.mutate({ id: conv.id });
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/50 text-xs text-muted-foreground space-y-2">
        <div className="flex justify-between">
          <span>Conversations</span>
          <span>{stats?.totalConversations || 0}</span>
        </div>
        <div className="flex justify-between">
          <span>Messages</span>
          <span>{stats?.totalMessages || 0}</span>
        </div>
        <div className="flex justify-between">
          <span>Scripts</span>
          <span>{stats?.totalScripts || 0}</span>
        </div>
        
        <Link href="/settings" className="flex items-center gap-2 mt-4 pt-4 border-t border-sidebar-border text-sidebar-foreground hover:text-primary transition-colors cursor-pointer">
          <Settings className="w-4 h-4" />
          <span className="font-medium">Settings</span>
        </Link>
      </div>
    </div>
  );
}