import type { GameCategory } from "@/types/game";

type BankEntry = {
  title: string;
  question: string;
  choices?: string[];
  expectedAnswer: string;
};

export const TASK_BANK: Record<string, BankEntry[]> = {
  email_polish: [
    {
      title: "取引先メールを整えろ",
      question:
        "次の文章を取引先に送れる丁寧なメール文にしてください。\n\n「明日までに資料送ってください。」",
      expectedAnswer: "取引先向けの丁寧な依頼文になっていること",
    },
    {
      title: "急ぎの催促を上品に",
      question:
        "次の文章を取引先に送れる丁寧なメール文にしてください。\n\n「見積もりまだですか？早くしてください。」",
      expectedAnswer: "急かしつつも失礼のない催促文になっていること",
    },
    {
      title: "断りメールを柔らかく",
      question:
        "次の文章を取引先に送れる丁寧なメール文にしてください。\n\n「その日は無理です。別の日にしてください。」",
      expectedAnswer: "丁寧に日程変更を依頼する文になっていること",
    },
    {
      title: "謝罪メールを整えろ",
      question:
        "次の文章を取引先に送れる丁寧なメール文にしてください。\n\n「資料間違ってました。送り直します。」",
      expectedAnswer: "誠意ある謝罪と訂正の連絡になっていること",
    },
  ],
  calculation: [
    {
      title: "合計金額を出せ",
      question: "商品A：48円\n商品B：37円\n合計はいくらですか？",
      expectedAnswer: "85",
    },
    {
      title: "おつりを計算せよ",
      question: "523円の備品を1000円で購入しました。おつりはいくらですか？",
      expectedAnswer: "477",
    },
    {
      title: "残予算を出せ",
      question: "予算90円のうち、64円を使いました。残りはいくらですか？",
      expectedAnswer: "26",
    },
    {
      title: "伝票の合計を出せ",
      question: "伝票1：32円\n伝票2：45円\n伝票3：18円\n合計はいくらですか？",
      expectedAnswer: "95",
    },
  ],
  keigo: [
    {
      title: "上司への報告を敬語に",
      question:
        "次の文章をビジネス敬語に変換してください。\n\n「了解です。あとでやっておきます。」",
      expectedAnswer: "承知いたしました。後ほど対応いたします。",
    },
    {
      title: "来客対応を敬語に",
      question:
        "次の文章をビジネス敬語に変換してください。\n\n「ちょっと待ってて。担当呼ぶから。」",
      expectedAnswer: "少々お待ちください。担当の者を呼んでまいります。",
    },
    {
      title: "電話対応を敬語に",
      question:
        "次の文章をビジネス敬語に変換してください。\n\n「田中は今いないです。あとで電話させます。」",
      expectedAnswer:
        "田中はただいま席を外しております。戻り次第、折り返しご連絡いたします。",
    },
  ],
  summary: [
    {
      title: "報告を一文に",
      question:
        "次の文章を一文で要約してください。\n\n「本日の会議では新商品の発売日について議論しました。製造側の準備は整っていますが、宣伝の準備が遅れているため、発売日を2週間延期することになりました。」",
      expectedAnswer: "宣伝準備の遅れにより新商品の発売日が2週間延期になった。",
    },
    {
      title: "メールを一文に",
      question:
        "次の文章を一文で要約してください。\n\n「先日ご依頼いただいたシステムの見積もりですが、機能追加のご要望を反映した結果、当初の金額から10万円増加し、合計60万円となりました。納期は変わらず来月末を予定しております。」",
      expectedAnswer: "機能追加により見積もりは60万円に増えたが納期は変わらない。",
    },
  ],
  priority: [
    {
      title: "最優先タスクを見抜け",
      question:
        "今は月曜の朝9時。最優先で対応すべきタスクはどれですか？",
      choices: [
        "A：来月の社内イベントの企画書づくり",
        "B：今日10時の客先プレゼン資料の最終確認",
        "C：先週のランチ代の経費精算",
        "D：デスクの片付け",
      ],
      expectedAnswer: "B",
    },
    {
      title: "クレーム対応の判断",
      question:
        "退勤30分前。最優先で対応すべきタスクはどれですか？",
      choices: [
        "A：明日朝イチの会議室の予約",
        "B：取引先からの「至急」と書かれたクレームメール対応",
        "C：来週の出張の新幹線予約",
        "D：今月の日報のまとめ",
      ],
      expectedAnswer: "B",
    },
  ],
};

export function pickRandom<T>(items: T[], rng: () => number = Math.random): T {
  return items[Math.floor(rng() * items.length)];
}

export function pickTaskFromBank(gameType: GameCategory): BankEntry {
  const entries = TASK_BANK[gameType] ?? TASK_BANK.email_polish;
  return pickRandom(entries);
}
