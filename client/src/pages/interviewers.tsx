import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Interviewer, InsertInterviewer } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Interviewers() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingInterviewer, setEditingInterviewer] = useState<Interviewer | null>(null);
  const [deletingInterviewer, setDeletingInterviewer] = useState<Interviewer | null>(null);
  const resetFormData = () => ({
    name: "", 
    email: "",
    vapiConfig: {
      assistantId: "",
      voiceProvider: "11labs",
      voiceId: "burt",
      model: "gpt-4",
      systemPrompt: "あなたはプロフェッショナルな面接官です。候補者に質問をして、回答を聞いてください。",
    }
  });

  const [formData, setFormData] = useState<InsertInterviewer>(resetFormData());

  const { data: interviewers, isLoading } = useQuery<Interviewer[]>({
    queryKey: ["/api/interviewers"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertInterviewer) => apiRequest("POST", "/api/interviewers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interviewers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setIsCreateOpen(false);
      setFormData(resetFormData());
      toast({ title: "面接官を作成しました" });
    },
    onError: () => {
      toast({ title: "エラーが発生しました", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InsertInterviewer }) =>
      apiRequest("PATCH", `/api/interviewers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interviewers"] });
      setEditingInterviewer(null);
      setFormData(resetFormData());
      toast({ title: "面接官を更新しました" });
    },
    onError: () => {
      toast({ title: "エラーが発生しました", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/interviewers/${id}`, undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interviewers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setDeletingInterviewer(null);
      toast({ title: "面接官を削除しました" });
    },
    onError: () => {
      toast({ title: "エラーが発生しました", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingInterviewer) {
      updateMutation.mutate({ id: editingInterviewer.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (interviewer: Interviewer) => {
    setEditingInterviewer(interviewer);
    setFormData({ 
      name: interviewer.name, 
      email: interviewer.email,
      vapiConfig: interviewer.vapiConfig || {
        assistantId: "",
        voiceProvider: "11labs",
        voiceId: "burt",
        model: "gpt-4",
        systemPrompt: "あなたはプロフェッショナルな面接官です。候補者に質問をして、回答を聞いてください。",
      }
    });
  };

  const handleCloseDialog = () => {
    setIsCreateOpen(false);
    setEditingInterviewer(null);
    setFormData(resetFormData());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-interviewers-title">面接官管理</h1>
          <p className="text-muted-foreground mt-2">
            面接官の作成、編集、削除を行います
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-interviewer">
          <Plus className="h-4 w-4 mr-2" />
          面接官を追加
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48 mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : interviewers && interviewers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {interviewers.map((interviewer) => (
            <Card key={interviewer.id} data-testid={`card-interviewer-${interviewer.id}`}>
              <CardHeader>
                <CardTitle data-testid={`text-interviewer-name-${interviewer.id}`}>
                  {interviewer.name}
                </CardTitle>
                <CardDescription data-testid={`text-interviewer-email-${interviewer.id}`}>
                  {interviewer.email}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(interviewer)}
                  data-testid={`button-edit-interviewer-${interviewer.id}`}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  編集
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeletingInterviewer(interviewer)}
                  data-testid={`button-delete-interviewer-${interviewer.id}`}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  削除
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground" data-testid="text-no-interviewers">
              面接官がまだ登録されていません。「面接官を追加」ボタンから登録してください。
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={isCreateOpen || !!editingInterviewer} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent data-testid="dialog-interviewer-form">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingInterviewer ? "面接官を編集" : "新しい面接官を追加"}
              </DialogTitle>
              <DialogDescription>
                面接官の情報を入力してください
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">名前</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="山田 太郎"
                  required
                  data-testid="input-interviewer-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="yamada@example.com"
                  required
                  data-testid="input-interviewer-email"
                />
              </div>

              <div className="pt-4 border-t">
                <h4 className="text-sm font-semibold mb-4">Vapi音声アシスタント設定</h4>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="assistantId">Assistant ID（任意）</Label>
                    <Input
                      id="assistantId"
                      value={formData.vapiConfig?.assistantId || ""}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        vapiConfig: { ...formData.vapiConfig!, assistantId: e.target.value }
                      })}
                      placeholder="既存のVapiアシスタントIDを入力"
                      data-testid="input-assistant-id"
                    />
                    <p className="text-xs text-muted-foreground">既存のVapiアシスタントを使用する場合はIDを入力。空欄の場合は自動作成されます。</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="voiceProvider">Voice Provider</Label>
                    <Input
                      id="voiceProvider"
                      value={formData.vapiConfig?.voiceProvider || ""}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        vapiConfig: { ...formData.vapiConfig!, voiceProvider: e.target.value }
                      })}
                      placeholder="11labs"
                      data-testid="input-voice-provider"
                    />
                    <p className="text-xs text-muted-foreground">例: 11labs, azure, playht</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="voiceId">Voice ID</Label>
                    <Input
                      id="voiceId"
                      value={formData.vapiConfig?.voiceId || ""}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        vapiConfig: { ...formData.vapiConfig!, voiceId: e.target.value }
                      })}
                      placeholder="burt"
                      data-testid="input-voice-id"
                    />
                    <p className="text-xs text-muted-foreground">プロバイダーの音声ID</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="model">AIモデル</Label>
                    <Input
                      id="model"
                      value={formData.vapiConfig?.model || ""}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        vapiConfig: { ...formData.vapiConfig!, model: e.target.value }
                      })}
                      placeholder="gpt-4"
                      data-testid="input-model"
                    />
                    <p className="text-xs text-muted-foreground">例: gpt-4, gpt-3.5-turbo</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="systemPrompt">システムプロンプト（任意）</Label>
                    <textarea
                      id="systemPrompt"
                      value={formData.vapiConfig?.systemPrompt || ""}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        vapiConfig: { ...formData.vapiConfig!, systemPrompt: e.target.value }
                      })}
                      placeholder="あなたはプロフェッショナルな面接官です..."
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      data-testid="input-system-prompt"
                    />
                    <p className="text-xs text-muted-foreground">アシスタントの振る舞いを定義</p>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                data-testid="button-cancel"
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-interviewer"
              >
                {createMutation.isPending || updateMutation.isPending ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingInterviewer} onOpenChange={(open) => !open && setDeletingInterviewer(null)}>
        <AlertDialogContent data-testid="dialog-delete-interviewer">
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。面接官「{deletingInterviewer?.name}」とそれに関連する質問、セッションも削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingInterviewer && deleteMutation.mutate(deletingInterviewer.id)}
              data-testid="button-confirm-delete"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
