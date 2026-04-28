# BirdieCause 🏌️‍♂️💚

A charity-first golf subscription platform. Subscribers log their Stableford scores, support a chosen cause, and compete in monthly draws to win a share of the prize pool.

Built with **TanStack Start**, **React 19**, **Tailwind v4**, and **Lovable Cloud** (managed Supabase).

---

## ✨ Features

- 🔐 Email/password authentication with secure JWT sessions
- 👥 Role-based access: `subscriber` and `admin` (separate `user_roles` table — no privilege escalation)
- ❤️ Charity selection at signup; featured charity on homepage
- ⛳ Score entry (Stableford 1–45), edit/delete, rolling 5 most recent rounds
- 🎯 Monthly draws: admin sets target score, simulates winners, publishes results
- 🏆 Winner verification flow: upload screenshot proof → admin approves/rejects → payout pending → paid
- 📦 Private storage bucket (`winner-proofs`) with signed URLs for admin review
- 🎨 Bold, cinematic dark UI — emotion-driven, mobile-first

---

## 🧪 Test Credentials

A seeded admin account is available out of the box:

| Role       | Email                    | Password       |
| ---------- | ------------------------ | -------------- |
| Admin      | `admin@birdiecause.test` | `Password123!` |
| Subscriber | _Sign up via `/signup`_  | _Your choice_  |

> The admin can access `/admin` to manage draws, verify winners, and mark payouts.

---

## 🚀 Getting Started

This project runs on **Lovable Cloud** — no local backend setup required. The `.env` file is auto-generated and contains your backend credentials.

### Local development

```bash
bun install
bun run dev
```

Visit [http://localhost:3000](http://localhost:3000).

---

## 🗺️ Routes

| Path         | Access        | Purpose                                               |
| ------------ | ------------- | ----------------------------------------------------- |
| `/`          | Public        | Hero, how it works, featured charity                  |
| `/signup`    | Public        | Create account + select charity                       |
| `/login`     | Public        | Sign in                                               |
| `/dashboard` | Authenticated | Subscription status, score entry, winnings + proof    |
| `/admin`     | Admin only    | Stats, draws management, winner verification, payouts |

---

## 🗄️ Data Model

- **`profiles`** — display name, selected charity
- **`user_roles`** — separate roles table (admin / subscriber)
- **`charities`** — public list with featured flag
- **`scores`** — rolling 5 per user, enforced by trigger
- **`draws`** — monthly draws (draft → open → closed → published)
- **`winners`** — links user to draw, holds proof path, verification + payout state
- **`winner-proofs`** — private storage bucket for screenshot evidence

All tables have RLS enabled. Admins use a `SECURITY DEFINER` `has_role()` function to avoid recursive policy checks.

---

## 🛣️ Roadmap

- [ ] Stripe subscriptions (two tiers)
- [ ] Welcome / draw-result emails
- [ ] Charity admin UI (CRUD)
- [ ] Public events / golf days

---

Built with intention on Lovable.
