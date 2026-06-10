# 追加要件定義：ゲーム追加可能なAIミニゲーム構成

## 1. 追加方針

本アプリは、初期リリース時点では「自由まで5日」という5ステージ制のAIタスクゲームとして提供する。

ただし、将来的に複数のミニゲームを追加できるように、ゲームロジック・タスク生成・採点処理を共通化し、各ゲームを独立したモジュールとして管理できる構成にする。

---

## 2. 技術構成

| 項目           | 使用技術                                  |
| ------------ | ------------------------------------- |
| フロントエンド      | Next.js / React                       |
| デザイン         | Tailwind CSS                          |
| デプロイ         | Vercel                                |
| ソース管理        | GitHub                                |
| DB / 認証 / 保存 | Supabase                              |
| AI API       | ChatGPT API                           |
| API実装        | Next.js API Routes または Server Actions |
| ホスティング連携     | GitHub → Vercel 自動デプロイ                |

---

## 3. インフラ構成

### 3.1 開発・デプロイフロー

```text
ローカル開発
↓
GitHubへpush
↓
Vercelが自動ビルド
↓
Vercelに本番デプロイ
↓
Next.js APIからChatGPT API / Supabaseへ接続
```

### 3.2 サービス役割

| サービス        | 役割                            |
| ----------- | ----------------------------- |
| GitHub      | ソースコード管理                      |
| Vercel      | フロントエンド・API Routesのホスティング     |
| Supabase    | ユーザー情報、ゲーム結果、スコア、ゲーム設定の保存     |
| ChatGPT API | タスク生成、回答採点、フィードバック生成、エンディング生成 |

---

## 4. ゲーム追加可能な設計

### 4.1 基本思想

各ミニゲームは、以下の共通インターフェースを持つ。

1. ゲーム情報
2. 出題ロジック
3. 回答形式
4. 採点ロジック
5. 結果表示
6. AIプロンプト

これにより、新しいゲームを追加する場合でも、既存の画面・DB・AI API処理を使い回せる。

---

## 5. ゲーム定義データ

### 5.1 GameDefinition

```ts
export type GameDefinition = {
  id: string;
  title: string;
  description: string;
  category: GameCategory;
  timeLimit: number;
  difficulty: "easy" | "normal" | "hard";
  inputType: "text" | "number" | "choice" | "textarea";
  scoringType: "ai" | "exact" | "hybrid";
  promptType: string;
};
```

### 5.2 GameCategory

```ts
export type GameCategory =
  | "email_polish"
  | "calculation"
  | "keigo"
  | "summary"
  | "priority"
  | "typo_fix"
  | "reply"
  | "custom";
```

---

## 6. 初期実装するゲーム

### 6.1 メール丁寧化ゲーム

| 項目    | 内容                      |
| ----- | ----------------------- |
| ゲームID | email_polish            |
| 内容    | 雑なメール文を取引先向けに丁寧な文章へ変換する |
| 回答形式  | textarea                |
| 採点方式  | AI採点                    |
| 制限時間  | 30秒                     |

#### 例

```text
問題：
次の文章を取引先に送れる丁寧なメール文にしてください。

明日までに資料送ってください。
```

---

### 6.2 事務計算ゲーム

| 項目    | 内容                      |
| ----- | ----------------------- |
| ゲームID | calculation             |
| 内容    | 2桁の足し算・引き算・簡単な合計金額を計算する |
| 回答形式  | number                  |
| 採点方式  | exact または hybrid        |
| 制限時間  | 30秒                     |

#### 例

```text
問題：
商品A：48円
商品B：37円
合計はいくらですか？
```

---

### 6.3 敬語変換ゲーム

| 項目    | 内容                   |
| ----- | -------------------- |
| ゲームID | keigo                |
| 内容    | カジュアルな文章をビジネス敬語に変換する |
| 回答形式  | textarea             |
| 採点方式  | AI採点                 |
| 制限時間  | 30秒                  |

---

### 6.4 要約ゲーム

| 項目    | 内容           |
| ----- | ------------ |
| ゲームID | summary      |
| 内容    | 短い文章を一文で要約する |
| 回答形式  | textarea     |
| 採点方式  | AI採点         |
| 制限時間  | 30秒          |

---

### 6.5 優先順位判断ゲーム

| 項目    | 内容                  |
| ----- | ------------------- |
| ゲームID | priority            |
| 内容    | 複数の業務タスクから最優先のものを選ぶ |
| 回答形式  | choice              |
| 採点方式  | hybrid              |
| 制限時間  | 30秒                 |

---

## 7. ゲーム追加方法

新しいゲームを追加する場合は、以下を追加する。

```text
1. GameDefinitionを追加
2. 問題生成プロンプトを追加
3. 採点プロンプトを追加
4. 回答UIタイプを指定
5. 必要に応じてSupabase側のカテゴリを追加
```

### 7.1 追加例：タイピングゲーム

```ts
{
  id: "typing",
  title: "タイピング修行",
  description: "表示された文章を30秒以内に正確に入力する",
  category: "custom",
  timeLimit: 30,
  difficulty: "easy",
  inputType: "text",
  scoringType: "exact",
  promptType: "typing"
}
```

---

## 8. ディレクトリ構成案

```text
src/
  app/
    page.tsx
    game/
      page.tsx
    result/
      page.tsx
    api/
      generate-tasks/
        route.ts
      score-answer/
        route.ts
      generate-ending/
        route.ts

  components/
    GameCard.tsx
    Timer.tsx
    AnswerInput.tsx
    ScoreResult.tsx
    FreedomGauge.tsx
    StageMap.tsx

  features/
    games/
      definitions.ts
      emailPolish.ts
      calculation.ts
      keigo.ts
      summary.ts
      priority.ts

    ai/
      prompts.ts
      openaiClient.ts
      generateTask.ts
      scoreAnswer.ts
      generateEnding.ts

    game-engine/
      types.ts
      reducer.ts
      scoring.ts
      progress.ts

  lib/
    supabaseClient.ts
    utils.ts

  types/
    game.ts
    task.ts
    score.ts
```

---

## 9. Supabase設計

### 9.1 `game_sessions`

ゲーム1プレイ単位の情報を保存する。

| カラム           | 型               | 内容                              |
| ------------- | --------------- | ------------------------------- |
| id            | uuid            | セッションID                         |
| user_id       | uuid / nullable | ログインユーザーID。匿名ならnull             |
| status        | text            | playing / completed / abandoned |
| current_day   | integer         | 現在の曜日ステージ                       |
| freedom_gauge | integer         | 自由ゲージ                           |
| final_rank    | text            | S / A / B / C                   |
| created_at    | timestamp       | 作成日時                            |
| completed_at  | timestamp       | 完了日時                            |

---

### 9.2 `game_tasks`

各ステージで出題されたタスクを保存する。

| カラム             | 型         | 内容                            |
| --------------- | --------- | ----------------------------- |
| id              | uuid      | タスクID                         |
| session_id      | uuid      | game_sessions.id              |
| day_index       | integer   | 0〜4                           |
| day_label       | text      | 月曜日〜金曜日                       |
| game_type       | text      | email_polish / calculation など |
| title           | text      | タスクタイトル                       |
| question        | text      | 問題文                           |
| expected_answer | text      | 模範解答・採点基準                     |
| time_limit      | integer   | 制限時間                          |
| created_at      | timestamp | 作成日時                          |

---

### 9.3 `game_answers`

ユーザー回答と採点結果を保存する。

| カラム            | 型         | 内容               |
| -------------- | --------- | ---------------- |
| id             | uuid      | 回答ID             |
| task_id        | uuid      | game_tasks.id    |
| session_id     | uuid      | game_sessions.id |
| user_answer    | text      | ユーザー回答           |
| elapsed_time   | integer   | 回答時間             |
| score          | integer   | AI採点スコア          |
| rank           | text      | S / A / B / C    |
| is_clear       | boolean   | クリア判定            |
| feedback       | text      | AIフィードバック        |
| battle_message | text      | ゲーム風演出           |
| reward_item    | text      | 獲得アイテム           |
| created_at     | timestamp | 回答日時             |

---

### 9.4 `game_definitions`

追加ゲームの設定を保存する。

| カラム          | 型         | 内容                                |
| ------------ | --------- | --------------------------------- |
| id           | text      | ゲームID                             |
| title        | text      | ゲーム名                              |
| description  | text      | 説明                                |
| category     | text      | カテゴリ                              |
| time_limit   | integer   | 制限時間                              |
| input_type   | text      | text / number / choice / textarea |
| scoring_type | text      | ai / exact / hybrid               |
| is_enabled   | boolean   | 利用可能か                             |
| created_at   | timestamp | 作成日時                              |

---

## 10. API設計

### 10.1 `/api/generate-tasks`

5日分のタスクを生成する。

#### Request

```json
{
  "difficulty": "normal",
  "enabledGameTypes": [
    "email_polish",
    "calculation",
    "keigo",
    "summary",
    "priority"
  ]
}
```

#### Response

```json
{
  "sessionId": "uuid",
  "tasks": [
    {
      "id": "uuid",
      "day": "月曜日",
      "gameType": "email_polish",
      "title": "取引先メールを整えろ",
      "question": "明日までに資料送ってください。",
      "expectedAnswer": "取引先向けの丁寧な依頼文になっていること",
      "timeLimit": 30,
      "inputType": "textarea",
      "scoringType": "ai"
    }
  ]
}
```

---

### 10.2 `/api/score-answer`

ユーザー回答を採点する。

#### Request

```json
{
  "sessionId": "uuid",
  "taskId": "uuid",
  "gameType": "email_polish",
  "question": "明日までに資料送ってください。",
  "expectedAnswer": "取引先向けの丁寧な依頼文になっていること",
  "userAnswer": "恐れ入りますが、明日までに資料をご送付いただけますでしょうか。",
  "elapsedTime": 22
}
```

#### Response

```json
{
  "score": 86,
  "rank": "A",
  "isClear": true,
  "feedback": "丁寧で自然な表現です。",
  "goodPoint": "依頼表現が柔らかく、取引先向けとして適切です。",
  "improvement": "締めの一文を加えるとさらに自然です。",
  "damage": 86,
  "freedomGain": 18,
  "battleMessage": "丁寧な依頼文が完成した！事務スライムに86ダメージ！",
  "rewardItem": "丁寧語の羽ペン"
}
```

---

### 10.3 `/api/generate-ending`

5日分の結果からエンディングを生成する。

#### Request

```json
{
  "sessionId": "uuid",
  "freedomGauge": 92,
  "results": [
    {
      "day": "月曜日",
      "gameType": "email_polish",
      "score": 86,
      "rank": "A"
    }
  ]
}
```

#### Response

```json
{
  "endingTitle": "平日突破者",
  "clearRank": "A",
  "saturdayTheme": "思いきり好きなことをする日",
  "saturdayPlan": {
    "morning": "ゆっくり起きる",
    "afternoon": "作りたいWebアプリを少し作る",
    "night": "好きな趣味に時間を使う"
  },
  "sundayTheme": "来週の自由を守る日",
  "sundayPlan": {
    "morning": "軽く休む",
    "afternoon": "来週の最初のタスクを1つ決める",
    "night": "早めに寝る"
  },
  "nextWeekBuff": "月曜ステージ開始時、自由ゲージ+10%",
  "finalMessage": "あなたは平日を突破し、土日の自由を取り戻しました。自由だ！"
}
```

---

## 11. AI設計

### 11.1 ChatGPT APIの利用箇所

| 用途             | API利用                        |
| -------------- | ---------------------------- |
| 5日分タスク生成       | 使用する                         |
| メール・敬語・要約などの採点 | 使用する                         |
| 計算問題の採点        | 原則ローカル採点。ただしフィードバック生成にAI使用可能 |
| 戦闘演出生成         | 採点レスポンス内で生成                  |
| 土日エンディング生成     | 使用する                         |

---

### 11.2 AI呼び出し回数

MVPでは、1プレイあたり最大7回を想定する。

| タイミング      | 回数 |
| ---------- | -: |
| 5日分タスク生成   | 1回 |
| 各日の採点      | 5回 |
| 土日エンディング生成 | 1回 |
| 合計         | 7回 |

ただし、計算問題はローカル採点にすることで、AI呼び出し回数を削減できる。

---

## 12. スコアリング設計

### 12.1 採点方式

| scoringType | 内容                   |
| ----------- | -------------------- |
| ai          | ChatGPT APIで採点       |
| exact       | 正答一致でローカル採点          |
| hybrid      | 正答判定はローカル、フィードバックはAI |

---

### 12.2 事務計算ゲームの採点

事務計算はAIに採点させず、サーバー側で正答判定する。

#### 理由

* 計算結果は明確
* 採点の安定性が高い
* APIコスト削減になる
* レスポンスが速い

#### 採点例

```ts
if (Number(userAnswer) === Number(expectedAnswer)) {
  score = 100;
} else {
  score = 0;
}
```

ただし、回答時間によってスコアを調整する。

```ts
const timeBonus = Math.max(0, 30 - elapsedTime);
```

---

## 13. ゲーム追加時の実装ルール

新しいミニゲームを追加する場合、以下のファイルを追加・編集する。

```text
features/games/definitions.ts
features/ai/prompts.ts
features/game-engine/scoring.ts
components/AnswerInput.tsx
```

### 13.1 追加時に決める項目

| 項目             | 内容        |
| -------------- | --------- |
| gameType       | ゲームID     |
| title          | 表示名       |
| inputType      | 回答形式      |
| scoringType    | 採点方式      |
| generatePrompt | 問題生成プロンプト |
| scorePrompt    | 採点プロンプト   |
| timeLimit      | 制限時間      |
| difficulty     | 難易度       |

---

## 14. 環境変数

Vercelに以下の環境変数を設定する。

```env
OPENAI_API_KEY=xxxxxxxx
NEXT_PUBLIC_SUPABASE_URL=xxxxxxxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxxxxx
```

### 注意

`SUPABASE_SERVICE_ROLE_KEY` はサーバー側でのみ使用し、フロントエンドには絶対に公開しない。

---

## 15. MVPでの優先順位

### 15.1 最優先

| 優先度 | 機能                     |
| --: | ---------------------- |
|   1 | GitHub / Vercel デプロイ構成 |
|   2 | ChatGPT API接続          |
|   3 | Supabase接続             |
|   4 | 5日分タスク生成               |
|   5 | 30秒タイマー                |
|   6 | 回答送信                   |
|   7 | 採点                     |
|   8 | 自由ゲージ                  |
|   9 | 土日解放エンディング             |

---

### 15.2 初期ゲーム

MVPでは、以下の3種類に絞る。

| ゲーム    | 理由              |
| ------ | --------------- |
| メール丁寧化 | AI採点の良さが出る      |
| 事務計算   | 30秒ゲームとして分かりやすい |
| 敬語変換   | 仕事っぽく、テーマに合う    |

要約・優先順位判断・誤字修正は追加ゲームとして後から実装する。

---

## 16. ハッカソン時の説明

このアプリは、AIが平日5日分の仕事風ミニゲームを生成し、ユーザーの回答を採点するWebゲームです。

月曜日から金曜日まで、毎日1つずつ30秒タスクに挑戦します。

タスクは、メール文の丁寧化、敬語変換、事務計算など、実際の仕事で起こりそうな内容です。

ユーザーが回答すると、ChatGPT APIが自然さ・丁寧さ・正確性をもとに採点し、ゲーム風のフィードバックを返します。

5日間を突破すると、土日が解放され、AIがユーザー専用の自由な土日プランを生成します。

また、ゲーム定義を分離しているため、後から新しいミニゲームを追加できます。

つまり本アプリは、単なる1本のゲームではなく、AIが出題・採点・演出を担当する、拡張可能なAIミニゲームプラットフォームです。
