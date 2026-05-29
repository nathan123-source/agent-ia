import { Sidebar } from "@/components/sidebar";
import { useGetSettings, useSaveSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: settings, isLoading } = useGetSettings();
  
  const [formData, setFormData] = useState({
    executor: "Custom",
    platform: "PC",
    obfuscation: "None",
    robloxVersion: "Latest",
    scriptStyle: "Clean",
    defaultMode: "Chat",
    uiLibPreference: "None",
    systemPromptExtra: ""
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        executor: settings.executor || "Custom",
        platform: settings.platform || "PC",
        obfuscation: settings.obfuscation || "None",
        robloxVersion: settings.robloxVersion || "Latest",
        scriptStyle: settings.scriptStyle || "Clean",
        defaultMode: settings.defaultMode || "Chat",
        uiLibPreference: settings.uiLibPreference || "None",
        systemPromptExtra: settings.systemPromptExtra || ""
      });
    }
  }, [settings]);

  const saveMutation = useSaveSettings({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        toast({ title: "Settings saved successfully" });
      }
    }
  });

  const handleChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    saveMutation.mutate({ data: formData });
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border flex items-center px-6 bg-card">
          <h1 className="font-semibold text-lg">Settings</h1>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl space-y-8">
            {isLoading ? (
              <div>Loading settings...</div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Executor</Label>
                    <Select value={formData.executor} onValueChange={(val) => handleChange("executor", val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select executor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Synapse X">Synapse X</SelectItem>
                        <SelectItem value="KRNL">KRNL</SelectItem>
                        <SelectItem value="Fluxus">Fluxus</SelectItem>
                        <SelectItem value="Delta">Delta</SelectItem>
                        <SelectItem value="Hydrogen">Hydrogen</SelectItem>
                        <SelectItem value="Custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Platform</Label>
                    <Select value={formData.platform} onValueChange={(val) => handleChange("platform", val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PC">PC</SelectItem>
                        <SelectItem value="Mobile">Mobile</SelectItem>
                        <SelectItem value="Console">Console</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Obfuscation Level</Label>
                    <Select value={formData.obfuscation} onValueChange={(val) => handleChange("obfuscation", val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select obfuscation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="None">None</SelectItem>
                        <SelectItem value="Light">Light</SelectItem>
                        <SelectItem value="Heavy">Heavy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>UI Library Preference</Label>
                    <Select value={formData.uiLibPreference} onValueChange={(val) => handleChange("uiLibPreference", val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select UI Library" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="None">None (Pure Roblox)</SelectItem>
                        <SelectItem value="Rayfield">Rayfield</SelectItem>
                        <SelectItem value="Fluent">Fluent</SelectItem>
                        <SelectItem value="Orion">Orion</SelectItem>
                        <SelectItem value="Custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Extra System Prompt</Label>
                  <Textarea 
                    value={formData.systemPromptExtra}
                    onChange={(e) => handleChange("systemPromptExtra", e.target.value)}
                    placeholder="Add specific instructions for the AI..."
                    className="min-h-[150px] font-mono text-sm bg-input border-border"
                  />
                  <p className="text-xs text-muted-foreground">Appended to the AI's base instructions.</p>
                </div>

                <Button 
                  onClick={handleSave} 
                  disabled={saveMutation.isPending}
                  className="w-full md:w-auto px-8 bg-primary text-primary-foreground"
                >
                  {saveMutation.isPending ? "Saving..." : "Save Settings"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}