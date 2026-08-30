// Citadel Fitness — developer analytics dashboard stats
// Deploy with: supabase functions deploy admin-dashboard-stats
// Set the admin gate once: supabase secrets set ADMIN_EMAIL=you@example.com
//
// Only the developer (identified by the ADMIN_EMAIL secret) can call this.
// Auth follows the same two-step pattern as delete-account: verify the
// caller's own JWT with an anon-key client first, THEN — only if their
// verified email matches ADMIN_EMAIL — open a service-role client to read
// aggregated data across all users. The service-role client bypasses RLS
// entirely, which is fine here because the admin check already gated
// access to it; no new RLS policy is needed on any table.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const DAY_MS = 24 * 60 * 60 * 1000;
// 30 rather than 14. Two weeks of bars is barely a trend: it cannot show a
// weekly rhythm twice, so it cannot show whether a quiet Sunday is the
// pattern or the story. Thirty days covers four full weeks and is still
// inside the 30-day activity fetch below, so it costs no extra query.
const TREND_DAYS = 30;

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: 'Missing Authorization header' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const adminEmail = Deno.env.get('ADMIN_EMAIL');

  // Identity comes from verifying the caller's own JWT — never from
  // anything client-supplied — same as delete-account.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await callerClient.auth.getUser();

  if (userError || !user) {
    return json({ error: 'Invalid or expired session' }, 401);
  }

  // Server-side admin gate. Only a verified JWT email that matches this
  // secret gets past here — nothing about the page URL matters.
  if (!adminEmail || user.email?.toLowerCase() !== adminEmail.toLowerCase()) {
    return json({ error: 'Not authorized' }, 403);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const now = Date.now();
  const cutoff = (days: number) => new Date(now - days * DAY_MS).toISOString();

  // Last N calendar dates (UTC, YYYY-MM-DD), oldest first, today last —
  // used to zero-fill trend series so a quiet day shows as a real dip
  // instead of a missing bar.
  function lastNDates(n: number): string[] {
    const dates: string[] = [];
    for (let i = n - 1; i >= 0; i--) {
      dates.push(new Date(now - i * DAY_MS).toISOString().slice(0, 10));
    }
    return dates;
  }
  const trendDates = lastNDates(TREND_DAYS);

  try {
    // --- Users: one paginated pass covers every users.* stat --------------
    // listUsers() defaults to 50/page — must page through fully or "total
    // users" silently caps at 50 forever.
    let allUsers: { created_at: string }[] = [];
    for (let page = 1; ; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      allUsers = allUsers.concat(data.users.map((u) => ({ created_at: u.created_at })));
      if (data.users.length < 1000) break;
    }
    const totalUsers = allUsers.length;
    const newThisWeek = allUsers.filter((u) => u.created_at >= cutoff(7)).length;
    const newPrevWeek = allUsers.filter(
      (u) => u.created_at >= cutoff(14) && u.created_at < cutoff(7)
    ).length;
    const dailySignups = (() => {
      const byDay = new Map<string, number>();
      for (const u of allUsers) {
        const day = u.created_at.slice(0, 10);
        if (trendDates.includes(day)) byDay.set(day, (byDay.get(day) ?? 0) + 1);
      }
      return trendDates.map((date) => ({ date, count: byDay.get(date) ?? 0 }));
    })();

    // Total registered users as of the end of each day in the window.
    //
    // Counted from every user's created_at rather than by accumulating
    // dailySignups, so the line starts at the real total on day one instead
    // of at zero. A growth curve that begins at zero every month is not a
    // growth curve, it is the last month's signups drawn a second time.
    const cumulativeUsers = (() => {
      const sorted = allUsers.map((u) => u.created_at).sort();
      return trendDates.map((date) => {
        const endOfDay = `${date}T23:59:59.999Z`;
        // Binary search for the first signup after this day; its index is
        // the count of everyone who existed by then.
        let lo = 0;
        let hi = sorted.length;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (sorted[mid] <= endOfDay) lo = mid + 1;
          else hi = mid;
        }
        return { date, count: lo };
      });
    })();

    // --- Activity: one 30-day fetch backs every active-user + behavior stat
    // Uses logged_exercises.created_at rather than workouts.created_at —
    // save_workout deletes and re-inserts every logged_exercise on every
    // save (new day AND edits of an old day), so this is a true "did they
    // do something in the app in this window" signal; workouts.created_at
    // would miss same-day edits to an older logged day.
    const { data: activityRows, error: activityError } = await admin
      .from('logged_exercises')
      .select('created_at, workouts(user_id), exercises(category)')
      .gte('created_at', cutoff(30));
    if (activityError) throw activityError;

    type ActivityRow = {
      created_at: string;
      workouts: { user_id: string } | null;
      exercises: { category: string } | null;
    };
    const rows = (activityRows ?? []) as unknown as ActivityRow[];

    function distinctUsersInWindow(fromDays: number, toDays = 0): number {
      const from = cutoff(fromDays);
      const to = cutoff(toDays);
      const ids = new Set(
        rows
          .filter((r) => r.created_at >= from && r.created_at < to)
          .map((r) => r.workouts?.user_id)
          .filter((id): id is string => Boolean(id))
      );
      return ids.size;
    }
    const active1d = distinctUsersInWindow(1);
    const active7d = distinctUsersInWindow(7);
    const active7dPrev = distinctUsersInWindow(14, 7);
    const active30d = distinctUsersInWindow(30);

    const dailyActiveUsers = trendDates.map((date) => {
      const ids = new Set(
        rows
          .filter((r) => r.created_at.slice(0, 10) === date)
          .map((r) => r.workouts?.user_id)
          .filter((id): id is string => Boolean(id))
      );
      return { date, count: ids.size };
    });

    const categoryBreakdown: Record<string, number> = {};
    for (const row of rows) {
      const category = row.exercises?.category ?? 'unknown';
      categoryBreakdown[category] = (categoryBreakdown[category] ?? 0) + 1;
    }

    // Which weekday people actually train on, over the last 30 days.
    //
    // Monday-first rather than JS's Sunday-first: the training week is the
    // thing being described, and it does not start on Sunday for anyone
    // using this app. Distinct users per weekday, not raw rows, so one
    // person logging a twelve-exercise session does not read as a busy
    // Tuesday.
    const dayOfWeek = (() => {
      const byDay: Set<string>[] = Array.from({ length: 7 }, () => new Set<string>());
      for (const row of rows) {
        const userId = row.workouts?.user_id;
        if (!userId) continue;
        // Monday = 0 … Sunday = 6.
        const jsDay = new Date(row.created_at).getUTCDay();
        byDay[(jsDay + 6) % 7].add(userId);
      }
      const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return labels.map((label, i) => ({ label, count: byDay[i].size }));
    })();

    const engagementRate7d = totalUsers > 0 ? Math.round((active7d / totalUsers) * 100) : 0;

    // --- Activation funnel ------------------------------------------------
    // Counted in the database rather than here: a PostgREST select caps at
    // 1000 rows, so counting distinct users over all workouts client-side
    // would start under-reporting silently. See 20260827100000.
    const { data: activation, error: activationError } = await admin.rpc('admin_activation_stats');
    if (activationError) throw activationError;
    const act = (activation ?? {}) as {
      everLogged?: number;
      activeLast7d?: number;
      activeLast30d?: number;
      workoutsLast30d?: number;
      setsLast30d?: number;
    };

    // Registered → ever logged anything → still here this month → this week.
    // Every stage is a subset of the one before it, so the drop between two
    // bars is the number of people lost at that step. This is the single
    // most useful thing on the page before launch: a signup count says how
    // well the store listing works, and this says whether the app does.
    const funnel = [
      { stage: 'Registered', count: totalUsers },
      { stage: 'Logged a workout', count: act.everLogged ?? 0 },
      { stage: 'Active in 30 days', count: act.activeLast30d ?? 0 },
      { stage: 'Active in 7 days', count: act.activeLast7d ?? 0 },
    ];

    const activationRate = totalUsers > 0
      ? Math.round(((act.everLogged ?? 0) / totalUsers) * 100)
      : 0;

    // --- Fortress waitlist total -----------------------------------------
    const { count: waitlistCount, error: waitlistError } = await admin
      .from('fortress_waitlist')
      .select('*', { count: 'exact', head: true });
    if (waitlistError) throw waitlistError;

    // --- Most-favorited articles ------------------------------------------
    const { data: favorites, error: favError } = await admin
      .from('article_favorites')
      .select('article_id, articles(title)');
    if (favError) throw favError;
    const favCounts = new Map<string, { title: string; count: number }>();
    for (const row of favorites ?? []) {
      const id = row.article_id as string;
      const title = (row as { articles: { title: string } | null }).articles?.title ?? 'Untitled';
      const existing = favCounts.get(id);
      favCounts.set(id, { title, count: (existing?.count ?? 0) + 1 });
    }
    const topArticles = [...favCounts.values()].sort((a, b) => b.count - a.count).slice(0, 5);

    // --- Support queue -----------------------------------------------------
    // Ordered in the database rather than here, and by entitlement rather
    // than by recency. Priority support is sold as "skip the queue", which
    // requires a queue that is actually ordered -- a reverse-chronological
    // list is the one sort that lets a paying member's message sink under
    // newer free-tier ones every day. See 20260827130000.
    const { data: recentFeedback, error: feedbackError } = await admin.rpc('admin_support_queue', {
      p_limit: 30,
    });
    if (feedbackError) throw feedbackError;

    type QueueRow = { answered_at: string | null; tier_rank: number };
    const queue = (recentFeedback ?? []) as QueueRow[];
    const outstanding = queue.filter((f) => f.answered_at === null);

    return json(
      {
        users: {
          total: totalUsers,
          newThisWeek,
          newThisWeekChangePct: pctChange(newThisWeek, newPrevWeek),
        },
        active: {
          last1d: active1d,
          last7d: active7d,
          last7dChangePct: pctChange(active7d, active7dPrev),
          last30d: active30d,
        },
        engagementRate7d,
        activationRate,
        funnel,
        trends: {
          dailySignups,
          dailyActiveUsers,
          cumulativeUsers,
          dayOfWeek,
        },
        volume30d: {
          workouts: act.workoutsLast30d ?? 0,
          sets: act.setsLast30d ?? 0,
          // Per active person, which is the number that means something.
          // "410 sets" is a vanity metric; "18 sets each" is a behaviour.
          workoutsPerActiveUser:
            active30d > 0 ? Math.round(((act.workoutsLast30d ?? 0) / active30d) * 10) / 10 : 0,
        },
        behavior: {
          categoryBreakdown30d: categoryBreakdown,
          fortressWaitlistCount: waitlistCount ?? 0,
          topFavoritedArticles: topArticles,
        },
        recentFeedback: recentFeedback ?? [],
        support: {
          outstanding: outstanding.length,
          // The number the tier's promise is actually measured on. Everything
          // else on this page describes the product; this describes whether
          // someone is being kept waiting for something they paid for.
          outstandingPaid: outstanding.filter((f) => f.tier_rank >= 1).length,
        },
        generatedAt: new Date().toISOString(),
      },
      200
    );
  } catch (err) {
    // Supabase/Postgrest query errors are plain objects with a `.message`,
    // not real Error instances — `err instanceof Error` misses them and
    // silently loses the actual cause, so check for `.message` directly.
    const message =
      err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : String(err);
    return json({ error: message }, 500);
  }
});
