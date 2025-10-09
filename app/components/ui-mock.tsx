"use client";

export default function UiMock() {
  return (
    <div className="mx-auto mt-12 w-[92%] md:w-[72%]">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 backdrop-blur p-4 md:p-6 shadow-2xl">
        {/* window header dots */}
        <div className="flex items-center gap-2 mb-4">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
          <div className="ml-auto h-6 w-36 rounded-md bg-zinc-800" />
        </div>

        <div className="grid grid-cols-12 gap-4">
          {/* sidebar */}
          <aside className="col-span-3 hidden md:block">
            <div className="space-y-2">
              <div className="h-9 rounded-lg bg-zinc-800" />
              <div className="h-9 rounded-lg bg-zinc-800/70" />
              <div className="h-9 rounded-lg bg-zinc-800/70" />
              <div className="h-9 rounded-lg bg-zinc-800/70" />
            </div>
          </aside>

          {/* main */}
          <div className="col-span-12 md:col-span-9">
            {/* top toolbar */}
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 flex-1 rounded-lg bg-zinc-800" />
              <div className="h-9 w-24 rounded-lg bg-zinc-800" />
              <div className="h-9 w-24 rounded-lg bg-white text-zinc-900 grid place-items-center text-xs font-semibold">
                Boost
              </div>
            </div>

            {/* before/after cards */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <div className="text-xs text-zinc-400 mb-2">❌ Before</div>
                <div className="h-24 rounded-md bg-gradient-to-br from-zinc-800 to-zinc-900 animate-pulse" />
                <div className="mt-3 h-3 w-2/3 rounded bg-zinc-800" />
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <div className="text-xs text-green-400 mb-2">✅ After</div>
                <div className="h-24 rounded-md bg-gradient-to-br from-green-500/20 to-emerald-400/10 ring-1 ring-emerald-500/30" />
                <div className="mt-3 h-3 w-1/2 rounded bg-emerald-500/40" />
              </div>
            </div>

            {/* bottom stats */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="h-14 rounded-lg bg-zinc-800" />
              <div className="h-14 rounded-lg bg-zinc-800/80" />
              <div className="h-14 rounded-lg bg-zinc-800/60" />
            </div>
          </div>
        </div>
      </div>

      {/* small phone mock */}
      <div className="-mt-8 ml-auto mr-4 w-36 rounded-[22px] border border-zinc-700 bg-zinc-900 p-3 shadow-xl hidden md:block">
        <div className="h-24 rounded-md bg-zinc-800" />
        <div className="mt-2 h-3 rounded bg-zinc-700" />
        <div className="mt-1 h-3 w-2/3 rounded bg-zinc-700/80" />
        <div className="mt-3 h-6 rounded-lg bg-white text-zinc-900 grid place-items-center text-[10px] font-semibold">
          Copy
        </div>
      </div>
    </div>
  );
}
