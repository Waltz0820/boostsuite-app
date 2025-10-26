// modules/intent_mapper.ts
// Boost Suite: Category → Emotion → Style resolver (no external deps)

import * as fs from "fs";
import * as path from "path";

// ---------- 型定義 ----------
type CategoryRow = {
  l1: string; // 第一階層カテゴリ
  l2: string; // 第二階層カテゴリ
  mode: string; // 出力モードタグ
  pitch: string[]; // 訴求軸（キーワード配列）
};

type EmotionItem = {
  id: string;
  aliases?: string[];
  tones?: string[];
  patterns?: string[];
  use_for_modes?: string[];
};

type EmotionOverride = {
  category: string; // "第一階層/第二階層"
  primary_emotion: string;
  fallbacks?: string[];
};

type EmotionLayerV1 = {
  $schema?: string;
  version?: string;
  default_emotion?: string;
  emotions: EmotionItem[];
  category_overrides?: EmotionOverride[];
};

type StyleItem = {
  id: string;
  voice?: string;
  rhythm?: string;
  lexicon_plus?: string[];
  lexicon_minus?: string[];
  use_for_modes?: string[];
};

type MediaOverride = {
  media: string; // "ad" | "social" | "lp"
  sentence_length?: string; // very_short | short | long
  emoji?: boolean;
};

type StyleLayerV1 = {
  $schema?: string;
  version?: string;
  defaults?: {
    voice?: string;
    sentence_length?: string;
    emoji?: boolean;
  };
  styles: StyleItem[];
  media_overrides?: MediaOverride[];
};

// ---------- ユーティリティ ----------
function stripBOM(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

function readFileUTF8(p: string): string {
  return stripBOM(fs.readFileSync(p, "utf-8"));
}

// ---------- CSVローダ（4列目以降を訴求軸として結合する仕様） ----------
function loadCategoryMaster(csvPath: string): CategoryRow[] {
  const raw = readFileUTF8(csvPath);
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) throw new Error("Category CSV が空です。");

  // 1行目はヘッダ
  const rows: CategoryRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    // 先頭3カンマで4列抽出、以降は訴求軸として結合
    const parts = line.split(",");
    if (parts.length < 4) {
      // 万一4列未満ならスキップ
      continue;
    }
    const l1 = parts[0]?.trim() ?? "";
    const l2 = parts[1]?.trim() ?? "";
    const mode = parts[2]?.trim() ?? "";

    // 4列目以降をすべて結合し、キーワードとして扱う（空要素は除外）
    const pitch = parts
      .slice(3)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (!l1 || !l2 || !mode) continue;

    rows.push({ l1, l2, mode, pitch });
  }
  return rows;
}

// ---------- JSONローダ ----------
function loadJSON<T>(filePath: string): T {
  const raw = readFileUTF8(filePath);
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    throw new Error(
      `JSON parse error at ${filePath}：${(e as Error).message}\n内容を確認してください（BOM・末尾カンマ・コメント不可）。`
    );
  }
}

// ---------- EmotionLayer ----------
function loadEmotionLayer(filePath: string): EmotionLayerV1 {
  const data = loadJSON<EmotionLayerV1>(filePath);
  if (!Array.isArray(data.emotions)) {
    throw new Error("EmotionLayer: 'emotions' が配列ではありません。");
  }
  return data;
}

function resolveEmotion(
  emoDoc: EmotionLayerV1,
  l1: string,
  l2: string,
  mode: string
): { id: string; pattern?: string } {
  const catKey = `${l1}/${l2}`;
  const ov = emoDoc.category_overrides?.find((o) => o.category === catKey);

  const pickById = (id: string | undefined): EmotionItem | undefined => {
    if (!id) return undefined;
    return emoDoc.emotions.find((e) => e.id === id);
  };

  // 1) カテゴリオーバーライド優先
  if (ov) {
    const primary =
      pickById(ov.primary_emotion) ??
      (ov.fallbacks ?? [])
        .map((f) => pickById(f))
        .find((x): x is EmotionItem => !!x);
    if (primary) {
      return {
        id: primary.id,
        pattern: primary.patterns?.[0],
      };
    }
  }

  // 2) モード適合のemotionから先頭
  const byMode = emoDoc.emotions.find((e) =>
    e.use_for_modes?.includes(mode)
  );
  if (byMode) {
    return { id: byMode.id, pattern: byMode.patterns?.[0] };
  }

  // 3) デフォルト
  const def =
    pickById(emoDoc.default_emotion) ?? emoDoc.emotions[0] ?? { id: "安心" };
  return { id: def.id, pattern: def.patterns?.[0] };
}

// ---------- StyleLayer ----------
function loadStyleLayer(filePath: string): StyleLayerV1 {
  const data = loadJSON<StyleLayerV1>(filePath);
  if (!Array.isArray(data.styles)) {
    throw new Error("StyleLayer: 'styles' が配列ではありません。");
  }
  return data;
}

function resolveStyle(
  styleDoc: StyleLayerV1,
  mode: string,
  media: "ad" | "social" | "lp" = "lp"
): {
  id: string;
  voice: string;
  rhythm?: string;
  lexicon_plus?: string[];
  emoji: boolean;
  sentence_length: string;
} {
  const defaults = styleDoc.defaults ?? {};
  const mo = styleDoc.media_overrides?.find((m) => m.media === media);

  const style =
    styleDoc.styles.find((s) => s.use_for_modes?.includes(mode)) ??
    styleDoc.styles[0];

  const voice = style.voice ?? defaults.voice ?? "です・ます";
  const rhythm = style.rhythm;
  const emoji = mo?.emoji ?? defaults.emoji ?? false;
  const sentence_length = mo?.sentence_length ?? (defaults as any).sentence_length ?? "short";

  return {
    id: style.id,
    voice,
    rhythm,
    lexicon_plus: style.lexicon_plus,
    emoji,
    sentence_length,
  };
}

// ---------- 意図推定（超シンプルなヒューリスティック） ----------
function guessCategory(
  input: string,
  master: CategoryRow[]
): CategoryRow | undefined {
  const q = input.toLowerCase();

  // 1) 第二階層名の部分一致を優先
  const hitL2 =
    master.find((r) => q.includes(r.l2.toLowerCase())) ??
    master.find((r) => q.includes(r.l1.toLowerCase()));
  if (hitL2) return hitL2;

  // 2) 訴求軸キーワードにヒット
  for (const r of master) {
    if (r.pitch.some((p) => p && q.includes(p.toLowerCase()))) {
      return r;
    }
  }

  // 3) 代表カテゴリの素引き
  const hints: Array<[RegExp, string, string?]> = [
    [/ギフト|贈り物|プレゼント/, "ギフト", undefined],
    [/スキンケア|化粧水|美容液|コスメ|ハンドクリーム/, "美容・ヘルスケア", "スキンケア"],
    [/コーヒー|紅茶|飲料|ドリンク|お茶/, "食品・飲料", "飲料"],
    [/スイーツ|お菓子|チョコ|ケーキ/, "食品・飲料", "スイーツ・菓子"],
    [/ベビー|抱っこ|ベビーカー|スタイ|おむつ/, "キッズ・ベビー", "ベビー服・肌着"],
    [/ペット|猫|犬|フード/, "ペット", "ペットフード"],
    [/キャンプ|アウトドア|ヨガ|ランニング/, "ファッション", "スポーツ・アウトドアウェア"],
    [/ゲーム|AR|VR/, "ホビー・エンタメ", "ゲーム・AR"],
    [/掃除|収納|ランドリー|キッチン/, "キッチン・日用品", "清掃・ランドリー"],
  ];

  for (const [re, l1, l2] of hints) {
    if (re.test(input)) {
      const c =
        master.find((r) => r.l1 === l1 && (!l2 || r.l2 === l2)) ??
        master.find((r) => r.l1 === l1);
      if (c) return c;
    }
  }

  // 4) フォールバック：先頭カテゴリー
  return master[0];
}

// ---------- メイン ----------
async function main() {
  const root = process.cwd();
  const knowledgeDir = path.join(root, "knowledge");

  const catPath = path.join(knowledgeDir, "CategoryTree_v5.0.csv");
  const emoPath = path.join(knowledgeDir, "EmotionLayer.json");
  const styPath = path.join(knowledgeDir, "StyleLayer.json");

  // ロード
  const master = loadCategoryMaster(catPath);
  const emoDoc = loadEmotionLayer(emoPath);
  const styDoc = loadStyleLayer(styPath);

  // 引数
  const inputText = (process.argv[2] ?? "").trim();
  const mediaArg = (process.argv[3] ?? "lp").trim() as "ad" | "social" | "lp";

  // テスト入力の用意
  const inputs =
    inputText.length > 0
      ? [inputText]
      : [
          "プレゼントに合う高級ハンドクリームを探している",
          "アウトドアでも使えるコーヒー器具がほしい",
          "在宅ワーク用の収納とデスク周りを整えたい",
        ];

  const results = inputs.map((inp) => {
    const cat = guessCategory(inp, master)!;
    const emotion = resolveEmotion(emoDoc, cat.l1, cat.l2, cat.mode);
    const style = resolveStyle(styDoc, cat.mode, mediaArg);

    return {
      input: inp,
      category: {
        l1: cat.l1,
        l2: cat.l2,
        mode: cat.mode,
        pitch: cat.pitch.join("、"),
      },
      emotion,
      style,
    };
  });

  // 出力
  console.log(JSON.stringify(results.length === 1 ? results[0] : results, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});