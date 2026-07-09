import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageSquare, ClipboardList, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<{
    interviewersCount: number;
    questionsCount: number;
    sessionsCount: number;
    activeSessions: number;
  }>({
    queryKey: ["/api/stats"],
  });

  const statCards = [
    {
      title: "面接官",
      value: stats?.interviewersCount ?? 0,
      icon: Users,
      description: "登録されている面接官の数",
      testId: "stat-interviewers",
    },
    {
      title: "質問",
      value: stats?.questionsCount ?? 0,
      icon: MessageSquare,
      description: "作成された質問の総数",
      testId: "stat-questions",
    },
    {
      title: "面接セッション",
      value: stats?.sessionsCount ?? 0,
      icon: ClipboardList,
      description: "これまでの面接セッション",
      testId: "stat-sessions",
    },
    {
      title: "進行中",
      value: stats?.activeSessions ?? 0,
      icon: TrendingUp,
      description: "現在進行中のセッション",
      testId: "stat-active",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">ダッシュボード</h1>
        <p className="text-muted-foreground mt-2" data-testid="text-dashboard-subtitle">
          AI面接システムの概要と統計情報
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} data-testid={`card-${stat.testId}`}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold" data-testid={`text-${stat.testId}-value`}>
                      {stat.value}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.description}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>システム概要</CardTitle>
          <CardDescription>
            AI面接システムの主な機能
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                面接官管理
              </h3>
              <p className="text-sm text-muted-foreground">
                面接官の登録・編集・削除が可能です。各面接官に質問セットを割り当てることができます。
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                質問管理
              </h3>
              <p className="text-sm text-muted-foreground">
                面接質問を作成し、順序を設定できます。必須フィールドを指定して自動的に深掘り質問を生成します。
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                面接セッション
              </h3>
              <p className="text-sm text-muted-foreground">
                候補者専用URLを生成し、音声対話による面接を実施します。会話ログは自動的に保存されます。
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                リアルタイム追跡
              </h3>
              <p className="text-sm text-muted-foreground">
                面接の進行状況をリアルタイムで確認し、会話の文字起こしを閲覧できます。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
