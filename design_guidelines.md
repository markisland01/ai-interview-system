# AI面接システム デザインガイドライン

## デザインアプローチ

**選択手法**: Design System Approach（デザインシステムベース）
**採用システム**: Modern Enterprise UI（Material Design + Fluent Design要素の融合）
**根拠**: 企業向けHR技術アプリケーションとして、信頼性・使いやすさ・プロフェッショナルな印象が最優先。データ密度の高いダッシュボード、フォーム管理、リアルタイム面接インターフェースに対応する堅牢なシステムが必要。

**主要設計原則**:
- 明確な情報階層と視認性の高いコントラスト
- 直感的な操作フローとタスク完了の容易さ
- 信頼感を醸成するプロフェッショナルな外観
- 面接進行中のストレス軽減を考慮したUI

## コアデザイン要素

### A. カラーパレット

**ダークモード（デフォルト）**:
- Background Primary: `222 22% 8%`（ダークグレー）
- Background Secondary: `222 20% 12%`
- Surface: `222 18% 15%`
- Primary: `217 91% 60%`（信頼感のあるブルー）
- Primary Hover: `217 91% 55%`
- Text Primary: `210 40% 98%`
- Text Secondary: `217 10% 65%`
- Border: `217 10% 25%`
- Success: `142 76% 45%`（質問完了状態）
- Warning: `38 92% 50%`（要深掘り状態）
- Error: `0 72% 51%`（エラー状態）

**ライトモード**:
- Background Primary: `0 0% 100%`
- Background Secondary: `210 20% 98%`
- Surface: `0 0% 100%`
- Primary: `217 91% 50%`
- Text Primary: `222 47% 11%`
- Text Secondary: `215 14% 34%`
- Border: `214 32% 91%`

### B. タイポグラフィ

**フォントファミリー**:
- Primary: 'Inter', system-ui, sans-serif（Google Fonts CDN）
- Monospace: 'JetBrains Mono', monospace（文字起こし表示用）

**フォントスケール**:
- Hero/Display: text-4xl (36px) / font-bold
- Page Title: text-3xl (30px) / font-bold
- Section Header: text-2xl (24px) / font-semibold
- Card Title: text-xl (20px) / font-semibold
- Body: text-base (16px) / font-normal
- Caption/Meta: text-sm (14px) / font-normal
- Label: text-xs (12px) / font-medium uppercase tracking-wide

### C. レイアウトシステム

**Tailwindスペーシングプリミティブ**: 主に `4, 6, 8, 12, 16` の倍数を使用
- コンポーネント間: `space-y-6` または `gap-6`
- セクション間: `space-y-12`
- カード内パディング: `p-6` または `p-8`
- ページコンテナ: `px-4 md:px-6 lg:px-8`
- 最大幅: `max-w-7xl mx-auto`（ダッシュボード）、`max-w-4xl mx-auto`（面接画面）

**グリッドシステム**:
- ダッシュボード統計カード: `grid grid-cols-1 md:grid-cols-3 gap-6`
- 質問リスト: `grid grid-cols-1 gap-4`
- 面接官管理: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`

### D. コンポーネントライブラリ

**ナビゲーション**:
- サイドバー（デスクトップ）: 固定幅 `w-64`、背景 `bg-surface`、ボーダー右側
- モバイルメニュー: スライドインドロワー、オーバーレイ付き
- タブナビゲーション: 下線スタイル、アクティブ時プライマリーカラー

**データ表示**:
- 統計カード: 角丸 `rounded-lg`、影 `shadow-md`、ホバー時 `shadow-lg`遷移
- テーブル: ストライプ行、ホバー時背景変化、固定ヘッダー（スクロール時）
- 文字起こしパネル: モノスペースフォント、スクロール可能、タイムスタンプ表示

**フォーム要素**:
- 入力フィールド: `rounded-md border-2`、フォーカス時プライマリーボーダー、`h-12`
- テキストエリア: 最小高さ `min-h-32`、リサイズ可能
- セレクト: カスタムドロップダウン、検索機能付き（質問選択時）
- ボタン Primary: `bg-primary text-white rounded-md px-6 py-3 font-medium`
- ボタン Secondary: `border-2 border-primary text-primary rounded-md px-6 py-3 font-medium`
- アイコンボタン: `w-10 h-10 rounded-md` 中央配置アイコン

**面接インターフェース特有**:
- ビデオプレビュー: アスペクト比16:9、角丸 `rounded-xl`、影付き
- 音声インジケーター: 波形アニメーション、プライマリーカラー
- 質問表示カード: 大きなフォント `text-2xl`、中央配置、十分な余白
- 進捗バー: 上部固定、プライマリーカラー、アニメーション付き

**オーバーレイ/モーダル**:
- モーダル: 中央配置、最大幅 `max-w-2xl`、背景ブラー `backdrop-blur-sm`
- トースト通知: 右上配置、自動消去、成功/エラー色分け
- 確認ダイアログ: コンパクト、明確なアクション配置

### E. アニメーション

**非常に控えめに使用**:
- ページ遷移: なし（即座に表示）
- ホバー効果: `transition-colors duration-200`のみ
- モーダル表示: フェードイン `fade-in-0 duration-200`
- 音声インジケーター: `animate-pulse`（面接中のみ）
- トースト: スライドイン（右から）

## 画像使用方針

**ヒーローセクション**: なし（ダッシュボードアプリのため）

**アイコン**:
- ライブラリ: Heroicons（outline & solid）via CDN
- サイズ: `h-5 w-5`（インライン）、`h-6 w-6`（ボタン内）、`h-8 w-8`（カード見出し）
- カラー: テキストカラーに追従、ホバー時プライマリーカラー

**面接インターフェース画像**:
- プレースホルダーアバター: 候補者カメラオフ時の人物シルエットアイコン
- 企業ロゴ: 左上固定配置、高さ `h-8`

**ダッシュボード**:
- 空状態イラスト: シンプルなSVGイラスト（質問未作成時など）
- 統計チャート: Chart.js等でデータビジュアライゼーション（フェーズ2）