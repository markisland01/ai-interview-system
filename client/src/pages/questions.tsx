import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, GripVertical, ArrowUp, ArrowDown, ArrowLeft } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Question, InsertQuestion, Interviewer, QuestionSet, InsertQuestionSet } from "@shared/schema";

// Extended type for question sets with question count
type QuestionSetWithCount = QuestionSet & { questionCount: number };
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cleanQuestionText } from "@/lib/utils";
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

export default function Questions() {
  const { toast } = useToast();
  
  // State for navigation flow
  const [selectedInterviewerId, setSelectedInterviewerId] = useState<string>("");
  const [selectedQuestionSetId, setSelectedQuestionSetId] = useState<string>("");
  
  // State for question set dialogs
  const [isQuestionSetCreateOpen, setIsQuestionSetCreateOpen] = useState(false);
  const [editingQuestionSet, setEditingQuestionSet] = useState<QuestionSet | null>(null);
  const [deletingQuestionSet, setDeletingQuestionSet] = useState<QuestionSet | null>(null);
  const [questionSetFormData, setQuestionSetFormData] = useState<InsertQuestionSet>({
    interviewerId: "",
    name: "",
    description: "",
  });
  
  // State for question dialogs
  const [isQuestionCreateOpen, setIsQuestionCreateOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [deletingQuestion, setDeletingQuestion] = useState<Question | null>(null);
  const [questionFormData, setQuestionFormData] = useState<InsertQuestion>({
    interviewerId: "",
    questionSetId: "",
    text: "",
    order: 0,
    requiredFields: [],
    followUpLogic: "",
  });
  const [requiredFieldInput, setRequiredFieldInput] = useState("");

  // Queries
  const { data: interviewers } = useQuery<Interviewer[]>({
    queryKey: ["/api/interviewers"],
  });

  const { data: questionSets, isLoading: isLoadingQuestionSets } = useQuery<QuestionSetWithCount[]>({
    queryKey: ["/api/question-sets", selectedInterviewerId],
    enabled: !!selectedInterviewerId,
  });

  const { data: questions, isLoading: isLoadingQuestions } = useQuery<Question[]>({
    queryKey: ["/api/questions/set", selectedQuestionSetId],
    enabled: !!selectedQuestionSetId,
  });

  // Question Set Mutations
  const createQuestionSetMutation = useMutation({
    mutationFn: (data: InsertQuestionSet) => apiRequest("POST", "/api/question-sets", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/question-sets", selectedInterviewerId] });
      setIsQuestionSetCreateOpen(false);
      resetQuestionSetForm();
      toast({ title: "質問セットを作成しました" });
    },
    onError: () => {
      toast({ title: "エラーが発生しました", variant: "destructive" });
    },
  });

  const updateQuestionSetMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InsertQuestionSet }) =>
      apiRequest("PATCH", `/api/question-sets/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/question-sets", selectedInterviewerId] });
      setEditingQuestionSet(null);
      resetQuestionSetForm();
      toast({ title: "質問セットを更新しました" });
    },
    onError: () => {
      toast({ title: "エラーが発生しました", variant: "destructive" });
    },
  });

  const deleteQuestionSetMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/question-sets/${id}`, undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/question-sets", selectedInterviewerId] });
      setDeletingQuestionSet(null);
      // If the deleted set was selected, clear the selection
      if (deletingQuestionSet?.id === selectedQuestionSetId) {
        setSelectedQuestionSetId("");
      }
      toast({ title: "質問セットを削除しました" });
    },
    onError: () => {
      toast({ title: "エラーが発生しました", variant: "destructive" });
    },
  });

  // Question Mutations
  const createQuestionMutation = useMutation({
    mutationFn: (data: InsertQuestion) => apiRequest("POST", "/api/questions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questions/set", selectedQuestionSetId] });
      queryClient.invalidateQueries({ queryKey: ["/api/question-sets", selectedInterviewerId] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setIsQuestionCreateOpen(false);
      resetQuestionForm();
      toast({ title: "質問を作成しました" });
    },
    onError: () => {
      toast({ title: "エラーが発生しました", variant: "destructive" });
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InsertQuestion }) =>
      apiRequest("PATCH", `/api/questions/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questions/set", selectedQuestionSetId] });
      setEditingQuestion(null);
      resetQuestionForm();
      toast({ title: "質問を更新しました" });
    },
    onError: () => {
      toast({ title: "エラーが発生しました", variant: "destructive" });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/questions/${id}`, undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questions/set", selectedQuestionSetId] });
      queryClient.invalidateQueries({ queryKey: ["/api/question-sets", selectedInterviewerId] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setDeletingQuestion(null);
      toast({ title: "質問を削除しました" });
    },
    onError: () => {
      toast({ title: "エラーが発生しました", variant: "destructive" });
    },
  });

  const reorderQuestionMutation = useMutation({
    mutationFn: ({ id, direction }: { id: string; direction: "up" | "down" }) =>
      apiRequest("POST", `/api/questions/${id}/reorder`, { direction }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questions/set", selectedQuestionSetId] });
    },
  });

  // Form handlers
  const resetQuestionSetForm = () => {
    setQuestionSetFormData({
      interviewerId: selectedInterviewerId,
      name: "",
      description: "",
    });
  };

  const resetQuestionForm = () => {
    setQuestionFormData({
      interviewerId: selectedInterviewerId,
      questionSetId: selectedQuestionSetId,
      text: "",
      order: questions?.length ?? 0,
      requiredFields: [],
      followUpLogic: "",
    });
    setRequiredFieldInput("");
  };

  const handleQuestionSetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingQuestionSet) {
      updateQuestionSetMutation.mutate({ id: editingQuestionSet.id, data: questionSetFormData });
    } else {
      createQuestionSetMutation.mutate(questionSetFormData);
    }
  };

  const handleQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingQuestion) {
      updateQuestionMutation.mutate({ id: editingQuestion.id, data: questionFormData });
    } else {
      createQuestionMutation.mutate(questionFormData);
    }
  };

  const handleEditQuestionSet = (questionSet: QuestionSet) => {
    setEditingQuestionSet(questionSet);
    setQuestionSetFormData({
      interviewerId: questionSet.interviewerId,
      name: questionSet.name,
      description: questionSet.description || "",
    });
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    setQuestionFormData({
      interviewerId: question.interviewerId,
      questionSetId: question.questionSetId || "",
      text: cleanQuestionText(question.text),
      order: question.order,
      requiredFields: question.requiredFields || [],
      followUpLogic: question.followUpLogic || "",
    });
  };

  const handleCloseQuestionSetDialog = () => {
    setIsQuestionSetCreateOpen(false);
    setEditingQuestionSet(null);
    resetQuestionSetForm();
  };

  const handleCloseQuestionDialog = () => {
    setIsQuestionCreateOpen(false);
    setEditingQuestion(null);
    resetQuestionForm();
  };

  const addRequiredField = () => {
    if (requiredFieldInput.trim()) {
      setQuestionFormData({
        ...questionFormData,
        requiredFields: [...(questionFormData.requiredFields || []), requiredFieldInput.trim()],
      });
      setRequiredFieldInput("");
    }
  };

  const removeRequiredField = (index: number) => {
    setQuestionFormData({
      ...questionFormData,
      requiredFields: questionFormData.requiredFields?.filter((_, i) => i !== index) || [],
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-questions-title">質問管理</h1>
          <p className="text-muted-foreground mt-2">
            {!selectedInterviewerId 
              ? "面接官を選択してください"
              : !selectedQuestionSetId
              ? "質問セットを選択してください" 
              : "質問の作成、編集、順序変更を行います"}
          </p>
        </div>
      </div>

      {/* Interviewer Selection */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Label htmlFor="interviewer-select">面接官を選択</Label>
          <Select 
            value={selectedInterviewerId} 
            onValueChange={(value) => {
              setSelectedInterviewerId(value);
              setSelectedQuestionSetId("");
            }}
          >
            <SelectTrigger id="interviewer-select" data-testid="select-interviewer">
              <SelectValue placeholder="面接官を選択してください" />
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
      </div>

      {/* Question Set List */}
      {selectedInterviewerId && !selectedQuestionSetId && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">質問セット一覧</h2>
            <Button
              onClick={() => {
                setQuestionSetFormData({
                  interviewerId: selectedInterviewerId,
                  name: "",
                  description: "",
                });
                setIsQuestionSetCreateOpen(true);
              }}
              data-testid="button-create-question-set"
            >
              <Plus className="h-4 w-4 mr-2" />
              質問セットを追加
            </Button>
          </div>

          {isLoadingQuestionSets ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-4 w-full mt-2" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : questionSets && questionSets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {questionSets.map((questionSet) => (
                <Card 
                  key={questionSet.id} 
                  className="hover-elevate cursor-pointer"
                  data-testid={`card-question-set-${questionSet.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div 
                        className="flex-1"
                        onClick={() => setSelectedQuestionSetId(questionSet.id)}
                      >
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg" data-testid={`text-question-set-name-${questionSet.id}`}>
                            {questionSet.name}
                          </CardTitle>
                          <Badge variant="secondary" data-testid={`badge-question-count-${questionSet.id}`}>
                            {questionSet.questionCount}問
                          </Badge>
                        </div>
                        {questionSet.description && (
                          <CardDescription className="mt-2" data-testid={`text-question-set-description-${questionSet.id}`}>
                            {questionSet.description}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditQuestionSet(questionSet);
                          }}
                          data-testid={`button-edit-question-set-${questionSet.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingQuestionSet(questionSet);
                          }}
                          data-testid={`button-delete-question-set-${questionSet.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
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
                <p className="text-muted-foreground" data-testid="text-no-question-sets">
                  この面接官の質問セットがまだ登録されていません。「質問セットを追加」ボタンから登録してください。
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Question List */}
      {selectedQuestionSetId && (
        <>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => setSelectedQuestionSetId("")}
              data-testid="button-back-to-question-sets"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              質問セット一覧に戻る
            </Button>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">
                {questionSets?.find(qs => qs.id === selectedQuestionSetId)?.name}の質問
              </h2>
            </div>
            <Button
              onClick={() => {
                setQuestionFormData({
                  interviewerId: selectedInterviewerId,
                  questionSetId: selectedQuestionSetId,
                  text: "",
                  order: questions?.length ?? 0,
                  requiredFields: [],
                  followUpLogic: "",
                });
                setIsQuestionCreateOpen(true);
              }}
              data-testid="button-create-question"
            >
              <Plus className="h-4 w-4 mr-2" />
              質問を追加
            </Button>
          </div>

          {isLoadingQuestions ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-full" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : questions && questions.length > 0 ? (
            <div className="space-y-4">
              {questions
                .sort((a, b) => a.order - b.order)
                .map((question, index) => (
                  <Card key={question.id} data-testid={`card-question-${question.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <GripVertical className="h-5 w-5 text-muted-foreground" />
                            <Badge variant="outline" data-testid={`badge-question-order-${question.id}`}>
                              質問 {question.order + 1}
                            </Badge>
                          </div>
                          <CardTitle className="text-lg" data-testid={`text-question-text-${question.id}`}>
                            {cleanQuestionText(question.text)}
                          </CardTitle>
                          {question.requiredFields && question.requiredFields.length > 0 && (
                            <CardDescription className="mt-2">
                              <span className="font-semibold">必須キーワード: </span>
                              {question.requiredFields.map((field, i) => (
                                <Badge key={i} variant="secondary" className="mr-1">
                                  {field}
                                </Badge>
                              ))}
                            </CardDescription>
                          )}
                          {question.followUpLogic && (
                            <CardDescription className="mt-2">
                              <span className="font-semibold">深掘りロジック: </span>
                              {question.followUpLogic}
                            </CardDescription>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => reorderQuestionMutation.mutate({ id: question.id, direction: "up" })}
                            disabled={index === 0}
                            data-testid={`button-move-up-${question.id}`}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => reorderQuestionMutation.mutate({ id: question.id, direction: "down" })}
                            disabled={index === questions.length - 1}
                            data-testid={`button-move-down-${question.id}`}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditQuestion(question)}
                            data-testid={`button-edit-question-${question.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setDeletingQuestion(question)}
                            data-testid={`button-delete-question-${question.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
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
                <p className="text-muted-foreground" data-testid="text-no-questions">
                  この質問セットの質問がまだ登録されていません。「質問を追加」ボタンから登録してください。
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Question Set Create/Edit Dialog */}
      <Dialog open={isQuestionSetCreateOpen || !!editingQuestionSet} onOpenChange={(open) => !open && handleCloseQuestionSetDialog()}>
        <DialogContent data-testid="dialog-question-set-form">
          <form onSubmit={handleQuestionSetSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingQuestionSet ? "質問セットを編集" : "新しい質問セットを追加"}
              </DialogTitle>
              <DialogDescription>
                質問セットの名前と説明を設定してください
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="question-set-name">質問セット名</Label>
                <Input
                  id="question-set-name"
                  value={questionSetFormData.name}
                  onChange={(e) => setQuestionSetFormData({ ...questionSetFormData, name: e.target.value })}
                  placeholder="例: 営業職面接"
                  required
                  data-testid="input-question-set-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="question-set-description">説明（オプション）</Label>
                <Textarea
                  id="question-set-description"
                  value={questionSetFormData.description || ""}
                  onChange={(e) => setQuestionSetFormData({ ...questionSetFormData, description: e.target.value })}
                  placeholder="例: 営業職の採用面接で使用する質問セット"
                  data-testid="input-question-set-description"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseQuestionSetDialog}
                data-testid="button-cancel-question-set"
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={createQuestionSetMutation.isPending || updateQuestionSetMutation.isPending}
                data-testid="button-save-question-set"
              >
                {createQuestionSetMutation.isPending || updateQuestionSetMutation.isPending ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Question Create/Edit Dialog */}
      <Dialog open={isQuestionCreateOpen || !!editingQuestion} onOpenChange={(open) => !open && handleCloseQuestionDialog()}>
        <DialogContent className="max-w-2xl" data-testid="dialog-question-form">
          <form onSubmit={handleQuestionSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingQuestion ? "質問を編集" : "新しい質問を追加"}
              </DialogTitle>
              <DialogDescription>
                質問内容と深掘りロジックを設定してください
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="text">質問内容</Label>
                <Textarea
                  id="text"
                  value={questionFormData.text}
                  onChange={(e) => setQuestionFormData({ ...questionFormData, text: e.target.value })}
                  placeholder="例: あなたのこれまでの経験について教えてください"
                  required
                  data-testid="input-question-text"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="required-fields">必須キーワード（回答に含まれるべき要素）</Label>
                <div className="flex gap-2">
                  <Input
                    id="required-fields"
                    value={requiredFieldInput}
                    onChange={(e) => setRequiredFieldInput(e.target.value)}
                    placeholder="例: プロジェクト規模"
                    data-testid="input-required-field"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addRequiredField();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={addRequiredField}
                    data-testid="button-add-required-field"
                  >
                    追加
                  </Button>
                </div>
                {questionFormData.requiredFields && questionFormData.requiredFields.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {questionFormData.requiredFields.map((field, index) => (
                      <Badge key={index} variant="secondary" className="gap-1">
                        {field}
                        <button
                          type="button"
                          onClick={() => removeRequiredField(index)}
                          className="ml-1 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="follow-up-logic">深掘りロジック（オプション）</Label>
                <Textarea
                  id="follow-up-logic"
                  value={questionFormData.followUpLogic || ""}
                  onChange={(e) => setQuestionFormData({ ...questionFormData, followUpLogic: e.target.value })}
                  placeholder="例: 具体的な数値や成果について深掘りする"
                  data-testid="input-follow-up-logic"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseQuestionDialog}
                data-testid="button-cancel"
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={createQuestionMutation.isPending || updateQuestionMutation.isPending}
                data-testid="button-save-question"
              >
                {createQuestionMutation.isPending || updateQuestionMutation.isPending ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Question Set Delete Confirmation */}
      <AlertDialog open={!!deletingQuestionSet} onOpenChange={(open) => !open && setDeletingQuestionSet(null)}>
        <AlertDialogContent data-testid="dialog-delete-question-set">
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。質問セット「{deletingQuestionSet?.name}」とその中のすべての質問が削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-question-set">キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingQuestionSet && deleteQuestionSetMutation.mutate(deletingQuestionSet.id)}
              data-testid="button-confirm-delete-question-set"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Question Delete Confirmation */}
      <AlertDialog open={!!deletingQuestion} onOpenChange={(open) => !open && setDeletingQuestion(null)}>
        <AlertDialogContent data-testid="dialog-delete-question">
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。質問「{deletingQuestion?.text}」が削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingQuestion && deleteQuestionMutation.mutate(deletingQuestion.id)}
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
