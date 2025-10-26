// /lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// 型はあとで追加できるので最初は any でOK
type DB = any;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY; // サーバ専用

// ✅ クライアント（RLS適用／フロント＆サーバ読み取り用）
export const supabasePublic = createClient<DB>(url, anon, {
  auth: { persistSession: false },
});

// ✅ 管理用クライアント（RLS無視／サーバ内だけで使用）
export const supabaseAdmin =
  serviceRole
    ? createClient<DB>(url, serviceRole, { auth: { persistSession: false } })
    : null;
