import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, ExternalLink, Eye, Copy, CheckCircle2, Volume2, MessageSquare, ClipboardList } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { InterviewSession, Interviewer, ConversationLog, InterviewAnswer } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

type QuestionSet = {
  id: string;
  name: string;
  description: string | null;
  interviewerId: string;
  createdAt: string;
};

type InterviewSessionWithQuestionSet = InterviewSession & {
  questionSetName?: string | null;
};

export default function Sessions() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewingSession, setViewingSession] = useState<InterviewSession | null>(null);
  const [formData, setFormData] = useState({
    interviewerId: "",
    questionSetId: "",
    candidateName: "",
    candidateEmail: "",
  });

  const { data: interviewers } = useQuery<Interviewer[]>({
    queryKey: ["/api/interviewers"],
  });

  const { data: questionSets } = useQuery<QuestionSet[]>({
    queryKey: [`/api/question-sets/${formData.interviewerId}`],
    enabled: !!formData.interviewerId,
  });

  const { data: sessions, isLoading } = useQuery<InterviewSessionWithQuestionSet[]>({
    queryKey: ["/api/sessions"],
  });

  const { data: logs } = useQuery<ConversationLog[]>({
    queryKey: [`/api/sessions/${viewingSession?.id}/logs`],
    enabled: !!viewingSession,
  });

  const { data: answers } = useQuery<InterviewAnswer[]>({
    queryKey: [`/api/sessions/${viewingSession?.id}/answers`],
    enabled: !!viewingSession,
  });

  const createMutation = useMutation<InterviewSession, Error, typeof formData>({
    mutationFn: async (data) => {
      const response = await apiRequest("POST", "/api/sessions", data);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setIsCreateOpen(false);
      setFormData({ interviewerId: "", questionSetId: "", candidateName: "", candidateEmail: "" });
      
      // Show URL in toast with copy button
      const sessionUrl = `${window.location.origin}/interview/${data.sessionUrl}`;
      toast({
        title: "面接セッションを作成しました",
        description: (
          <div className="space-y-2 mt-2">
            <p className="text-sm">候補者用URL:</p>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-muted px-2 py-1 rounded flex-1 overflow-hidden text-ellipsis">
                {sessionUrl}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(sessionUrl);
                  toast({ title: "URLをコピーしました" });
                }}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ),
      });
    },
    onError: () => {
      toast({ title: "エラーが発生しました", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const copySessionUrl = (sessionUrl: string) => {
    const fullUrl = `${window.location.origin}/interview/${sessionUrl}`;
    navigator.clipboard.writeText(fullUrl);
    toast({ title: "URLをコピーしました" });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      pending: { variant: "secondary", label: "未開始" },
      in_progress: { variant: "default", label: "進行中" },
      completed: { variant: "outline", label: "完了" },
      cancelled: { variant: "destructive", label: "キャンセル" },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-sessions-title">面接セッション</h1>
          <p className="text-muted-foreground mt-2">
            面接セッションの作成と管理
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-session">
          <Plus className="h-4 w-4 mr-2" />
          セッションを作成
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64 mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : sessions && sessions.length > 0 ? (
        <div className="space-y-4">
          {sessions.map((session) => (
            <Card key={session.id} data-testid={`card-session-${session.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CardTitle data-testid={`text-session-candidate-${session.id}`}>
                        {session.candidateName}
                      </CardTitle>
                      {getStatusBadge(session.status)}
                    </div>
                    <CardDescription>
                      {session.questionSetName && (
                        <span className="block text-sm font-medium">質問セット: {session.questionSetName}</span>
                      )}
                      {session.candidateEmail && (
                        <span className="block">{session.candidateEmail}</span>
                      )}
                      <span className="block text-xs mt-1">
                        作成日時: {format(new Date(session.createdAt), "yyyy/MM/dd HH:mm", { locale: ja })}
                      </span>
                      {session.startedAt && (
                        <span className="block text-xs">
                          開始: {format(new Date(session.startedAt), "yyyy/MM/dd HH:mm", { locale: ja })}
                        </span>
                      )}
                      {session.completedAt && (
                        <span className="block text-xs">
                          完了: {format(new Date(session.completedAt), "yyyy/MM/dd HH:mm", { locale: ja })}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copySessionUrl(session.sessionUrl)}
                      data-testid={`button-copy-url-${session.id}`}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      URLコピー
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/interview/${session.sessionUrl}`, "_blank")}
                      data-testid={`button-open-session-${session.id}`}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      開く
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingSession(session)}
                      data-testid={`button-view-logs-${session.id}`}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      ログ
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground" data-testid="text-no-sessions">
              面接セッションがまだ作成されていません。「セッションを作成」ボタンから作成してください。
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent data-testid="dialog-create-session">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>新しい面接セッションを作成</DialogTitle>
              <DialogDescription>
                候補者情報を入力してください。専用URLが生成されます。
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="interviewer">面接官</Label>
                <Select
                  value={formData.interviewerId}
                  onValueChange={(value) => setFormData({ ...formData, interviewerId: value, questionSetId: "" })}
                  required
                >
                  <SelectTrigger id="interviewer" data-testid="select-session-interviewer">
                    <SelectValue placeholder="面接官を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {interviewers?.map((interviewer) => (
                      <SelectItem key={interviewer.id} value={interviewer.id}>
                        {interviewer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {formData.interviewerId && (
                <div className="space-y-2">
                  <Label htmlFor="question-set">質問セット</Label>
                  <Select
                    value={formData.questionSetId}
                    onValueChange={(value) => setFormData({ ...formData, questionSetId: value })}
                    required
                  >
                    <SelectTrigger id="question-set" data-testid="select-question-set">
                      <SelectValue placeholder="質問セットを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {questionSets?.map((set) => (
                        <SelectItem key={set.id} value={set.id}>
                          {set.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="candidate-name">候補者名</Label>
                <Input
                  id="candidate-name"
                  value={formData.candidateName}
                  onChange={(e) => setFormData({ ...formData, candidateName: e.target.value })}
                  placeholder="山田 花子"
                  required
                  data-testid="input-candidate-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="candidate-email">候補者メールアドレス（オプション）</Label>
                <Input
                  id="candidate-email"
                  type="email"
                  value={formData.candidateEmail}
                  onChange={(e) => setFormData({ ...formData, candidateEmail: e.target.value })}
                  placeholder="hanako@example.com"
                  data-testid="input-candidate-email"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                data-testid="button-cancel"
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                data-testid="button-save-session"
              >
                {createMutation.isPending ? "作成中..." : "作成"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingSession} onOpenChange={(open) => !open && setViewingSession(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]" data-testid="dialog-session-logs">
          <DialogHeader>
            <DialogTitle>{viewingSession?.candidateName} の面接結果</DialogTitle>
            <DialogDescription>
              {viewingSession?.questionSetName && (
                <span className="block mb-1">質問セット: {viewingSession.questionSetName}</span>
              )}
              会話ログと回答サマリー
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="answers" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="answers" data-testid="tab-answers">
                <ClipboardList className="h-4 w-4 mr-2" />
                回答サマリー
              </TabsTrigger>
              <TabsTrigger value="logs" data-testid="tab-logs">
                <MessageSquare className="h-4 w-4 mr-2" />
                会話ログ
              </TabsTrigger>
            </TabsList>

            <TabsContent value="answers" className="space-y-4 overflow-y-auto max-h-[60vh] pr-4 mt-4">
              {answers && answers.length > 0 ? (
                <div className="space-y-4">
                  {answers.map((answer, index) => {
                    const questionText = answer.questionText.replace(/^\[質問\d+\]\s*/, '');
                    const answerLines = answer.answerText.split('\n');
                    const mainAnswer = answerLines[0];
                    const followUpSection = answerLines.slice(1).join('\n');
                    const hasFollowUp = followUpSection.includes('【深掘り質問と回答】');

                    return (
                      <Card key={answer.id} data-testid={`answer-card-${index}`}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-base">
                              質問 {answer.questionIndex + 1}
                            </CardTitle>
                            <Badge variant="outline" className="text-xs">
                              {format(new Date(answer.answeredAt), "HH:mm", { locale: ja })}
                            </Badge>
                          </div>
                          <CardDescription className="text-sm font-normal pt-2">
                            {questionText}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">回答</p>
                            <p className="text-sm bg-muted p-3 rounded-lg">{mainAnswer.trim()}</p>
                          </div>

                          {hasFollowUp && (
                            <div className="pt-2 border-t">
                              <p className="text-sm font-medium text-muted-foreground mb-2">深掘り質問</p>
                              <div className="space-y-2 text-sm">
                                {followUpSection
                                  .split('\n')
                                  .filter(line => line.trim() && !line.includes('【深掘り質問と回答】'))
                                  .map((line, i) => {
                                    if (line.startsWith('Q')) {
                                      return (
                                        <p key={i} className="font-medium text-foreground">
                                          {line}
                                        </p>
                                      );
                                    } else if (line.startsWith('A')) {
                                      return (
                                        <p key={i} className="bg-muted/50 p-2 rounded ml-4">
                                          {line.substring(line.indexOf(':') + 1).trim()}
                                        </p>
                                      );
                                    }
                                    return null;
                                  })}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  まだ回答がありません
                </p>
              )}
            </TabsContent>

            <TabsContent value="logs" className="space-y-6 overflow-y-auto max-h-[60vh] pr-4 mt-4">
            {logs && logs.length > 0 ? (
              (() => {
                // Group logs by callId
                const logsByCallId = logs.reduce((acc, log) => {
                  const callId = log.callId || 'unknown';
                  if (!acc[callId]) {
                    acc[callId] = [];
                  }
                  acc[callId].push(log);
                  return acc;
                }, {} as Record<string, typeof logs>);

                return Object.entries(logsByCallId).map(([callId, callLogs], index) => {
                  // Get recording URL from first log in this callId group
                  const recordingUrl = callLogs.find(l => l.recordingUrl)?.recordingUrl;
                  
                  return (
                    <div key={callId} className="space-y-3">
                      {/* Interview header with recording */}
                      <div className="flex items-center justify-between pb-2 border-b">
                        <h4 className="text-sm font-semibold">面接 {index + 1}</h4>
                        {recordingUrl && (
                          <Badge variant="outline" className="text-xs">
                            <Volume2 className="h-3 w-3 mr-1" />
                            音声あり
                          </Badge>
                        )}
                      </div>
                      
                      {/* Recording player */}
                      {recordingUrl && (
                        <div className="p-3 bg-muted rounded-lg">
                          <audio 
                            controls 
                            className="w-full" 
                            data-testid={`audio-recording-${index}`}
                            src={recordingUrl}
                          >
                            お使いのブラウザは音声再生をサポートしていません。
                          </audio>
                        </div>
                      )}
                      
                      {/* Conversation logs */}
                      <div className="space-y-3">
                        {callLogs.map((log) => (
                          <div
                            key={log.id}
                            className={`p-3 rounded-lg ${
                              log.role === "assistant" ? "bg-muted" : "bg-primary/10"
                            }`}
                            data-testid={`log-${log.id}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant={log.role === "assistant" ? "secondary" : "default"}>
                                {log.role === "assistant" ? "AI面接官" : "候補者"}
                              </Badge>
                              {log.isFollowUp && (
                                <Badge variant="outline" className="text-xs">
                                  深掘り質問
                                </Badge>
                              )}
                            </div>
                            <p className="font-mono text-sm whitespace-pre-wrap">{log.message}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {format(new Date(log.timestamp), "HH:mm:ss", { locale: ja })}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()
            ) : (
              <p className="text-center text-muted-foreground py-8">
                まだ会話ログがありません
              </p>
            )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
