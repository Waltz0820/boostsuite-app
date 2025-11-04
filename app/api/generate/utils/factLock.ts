// app/api/generate/utils/factLock.ts
export const factLock = (text: string) => {
  let result = text;

  // 1️⃣ 禁止語・誇張表現の置換（薬機・景表対応）
  const banned = [
    /完治/g, /永久に/g, /100%/g, /絶対/g, /治す/g, /劇的/g, /最強/g,
    /即効/g, /保証/g, /完全/g, /奇跡/g, /誰でも/g, /必ず/g
  ];
  banned.forEach(reg => {
    result = result.replace(reg, '※使用感には個人差があります');
  });

  // 2️⃣ 単位の正規化（全角→半角＋明示）
  result = result
    .replace(/ｍｌ/g, 'mL')
    .replace(/ＭＬ/g, 'mL')
    .replace(/㎖/g, 'mL')
    .replace(/Ｖ/g, 'V')
    .replace(/ｗ/g, 'W')
    .replace(/℃/g, '°C');

  // 3️⃣ Bullet本数（5本固定）
  const bullets = result.match(/^- .+/gm);
  if (bullets && bullets.length > 5) {
    result = bullets.slice(0, 5).join('\n');
  }

  // 4️⃣ 断定表現→説明文調へ変換
  const patterns: [RegExp, string][] = [
    [/です。/g, 'です。※使用環境により異なります。'],
    [/ます。/g, 'ます。※個人差があります。'],
    [/。$/g, '。※感じ方には個人差があります。']
  ];
  patterns.forEach(([reg, rep]) => {
    result = result.replace(reg, rep);
  });

  // 5️⃣ 句読点・全角スペース・記号整理
  result = result
    .replace(/　/g, ' ')
    .replace(/。。/g, '。')
    .replace(/、、/g, '、')
    .replace(/\s+/g, ' ')
    .trim();

  return result;
};
