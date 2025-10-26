"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type IntentLog = {
  id: string;
  created_at: string;
  media: string | null;
  input_text: string;
  category_l1: string | null;
  category_l2: string | null;
  mode?: string | null;
  emotion_id: string | null;
  style_id: string | null;
};

const PAGE_SIZE = 50;

export default function Dashboard() {
  const [logs, setLogs] = useState<IntentLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [media, setMedia] = useState<"" | "ad" | "social" | "lp">("");
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);

  // 初回＆依存が変わるたびに取得
  useEffect(() => {
    fetchLogs();
    // Realtime: intent_logs の INSERT/UPDATE/DELETE を購読
    const channel = supabase
      .channel("rt-intent-logs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "intent_logs" },
        () => fetchLogs(false) // 直近の変更を反映
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media, q]);

  async function fetchLogs(showSpinner = true) {
    try {
      setError(null);
      if (showSpinner) setLoading(true);
      let query = supabase
        .from("intent_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (media) query = query.eq("media", media);
      if (q.trim()) {
        // input_text か カテゴリにヒットしたら拾う（OR）
        // Supabase は or() で複合条件を表現
        const like = `%${q.trim()}%`;
        query = query.or(
          `input_text.ilike.${like},category_l1.ilike.${like},category_l2.ilike.${like},emotion_id.ilike.${like},style_id.ilike.${like}`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      setLogs(data || []);
    } catch (e: any) {
      setError(e?.message || String(e));
      console.error(e);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }

  // CSV 書き出し
  function downloadCSV() {
    const header = [
      "id",
      "created_at",
      "media",
      "input_text",
      "category_l1",
      "category_l2",
      "mode",
      "emotion_id",
      "style_id",
    ];
    const rows = logs.map((r) =>
      [
        r.id,
        r.created_at,
        r.media ?? "",
        r.input_text?.replace(/\r?\n/g, " ").replace(/"/g, '""') ?? "",
        r.category_l1 ?? "",
        r.category_l2 ?? "",
        r.mode ?? "",
        r.emotion_id ?? "",
        r.style_id ?? "",
      ].map((v) => `"${String(v)}"`).join(",")
    );
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `intent_logs_${new Date().toISOString().slice(0, 19)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const empty = !loading && logs.length === 0;

  return (
    <main className="p-6 space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">🧭 Intent Dashboard</h1>
          <p className="text-sm text-gray-500">
            自分の生成履歴（RLSで本人のみ閲覧）。{PAGE_SIZE}件まで表示・自動更新。
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            className="border rounded px-2 py-1"
            value={media}
            onChange={(e) => setMedia(e.target.value as any)}
            title="媒体フィルタ"
          >
            <option value="">All media</option>
            <option value="ad">ad</option>
            <option value="social">social</option>
            <option value="lp">lp</option>
          </select>

          <input
            className="border rounded px-2 py-1 w-56"
            placeholder="検索（キーワード / カテゴリ / 感情 / 文体）"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <button
            onClick={() => fetchLogs()}
            className="bg-blue-500 text-white px-3 py-2 rounded"
            disabled={loading}
            title="最新を取得"
          >
            {loading ? "更新中..." : "🔄 更新"}
          </button>

          <button
            onClick={downloadCSV}
            className="bg-emerald-500 text-white px-3 py-2 rounded"
            disabled={logs.length === 0}
            title="表示中のテーブルをCSV保存"
          >
            ⬇ CSV
          </button>
        </div>
      </header>

      {error && (
        <div className="text-sm text-red-600 border border-red-200 bg-red-50 px-3 py-2 rounded">
          エラー: {error}
        </div>
      )}

      {empty ? (
        <div className="text-sm text-gray-500 border px-4 py-8 rounded text-center">
          まだログがありません。生成ボタンで作成すると、ここに流れてきます。
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[960px] w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1 w-40">Time</th>
                <th className="border px-2 py-1 w-16">Media</th>
                <th className="border px-2 py-1">Input</th>
                <th className="border px-2 py-1 w-60">Category</th>
                <th className="border px-2 py-1 w-24">Emotion</th>
                <th className="border px-2 py-1 w-24">Style</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="align-top">
                  <td className="border px-2 py-1">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="border px-2 py-1">{log.media}</td>
                  <td className="border px-2 py-1">
                    <div className="line-clamp-3 whitespace-pre-wrap">{log.input_text}</div>
                  </td>
                  <td className="border px-2 py-1">
                    {log.category_l1}/{log.category_l2}
                  </td>
                  <td className="border px-2 py-1">{log.emotion_id}</td>
                  <td className="border px-2 py-1">{log.style_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
