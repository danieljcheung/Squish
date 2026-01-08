# Squish

A mobile app that lets anyone create personalized AI coaching agents through friendly conversation. Each agent is an adorable, interactive slime character that transforms into a specialized persona to help users achieve their goals.

![React Native](https://img.shields.io/badge/React_Native-Expo-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Supabase](https://img.shields.io/badge/Backend-Supabase-green)
![Claude](https://img.shields.io/badge/AI-Claude_API-purple)

## Vision

Most people can't create AI agents because the setup is intimidating. Squish solves this by interviewing users in plain conversation, then generating a personalized agent behind the scenes.

The slime mascot makes AI feel approachable and fun rather than cold and technical.

## Features

### Interactive Slime Characters

- **Stress-ball Physics** — Drag and stretch the slime with satisfying, gooey deformation
- **Flick & Bounce** — Flick the slime and watch it bounce off walls with momentum physics
- **Expressive Faces** — Slimes blink, breathe, and react to interactions
- **Color Variants** — Mint, lavender, peach, sky blue, and more
- **Idle Animations** — Gentle breathing and organic shape morphing

### Fitness Coach

A slime that helps with workouts and diet.

- **Meal Photo Analysis** — Snap a photo and get AI-powered nutritional breakdown with calories, macros, and health scores
- **Workout Logging** — Track various workout types with duration and intensity
- **Water Tracking** — Log daily water intake with quick-add options
- **Daily Progress Cards** — Visual summary of meals, workouts, and hydration
- **Weekly Calendar** — See your activity patterns at a glance
- **Coaching Styles** — Choose between tough love, gentle encouragement, or balanced

### Finance Buddy

A slime that helps manage your money.

- **Expense Tracking** — Log expenses with categories, descriptions, and receipt photos
- **Income Tracking** — Record all income sources with categorization
- **Recurring Bills** — Manage subscriptions and recurring payments with due date reminders
- **Savings Goals** — Set goals with target amounts, deadlines, and visual progress tracking
- **Budget Breakdown** — 50/30/20 budget allocation (needs/wants/savings)
- **Financial Summaries** — Weekly and monthly spending reports with category breakdowns
- **Bill Confirmations** — Rich confirmation cards when adding bills
- **Smart Insights** — AI-powered spending analysis and recommendations

### Core Features

- **Dark Mode** — Full dark theme support across all screens
- **Conversational Onboarding** — Natural interview flow to set up each agent
- **Quick Actions** — Floating action buttons for common tasks
- **Quick Replies** — Context-aware suggested responses
- **Push Notifications** — Morning check-ins, meal reminders, bill due dates
- **Pull to Refresh** — Native refresh controls on all scrollable content
- **Persistent Memory** — Agents remember your preferences and history

## Tech Stack

| Layer | Technology |
|-------|------------|
| Mobile | Expo (React Native) with Expo Router |
| Backend | Supabase (Auth, Database, Storage) |
| AI | Claude API (Sonnet 3.5) |
| Animations | React Native Reanimated |
| Gestures | React Native Gesture Handler |
| Notifications | Expo Push Notifications |

## Project Structure

```
squish/
├── app/                    # Expo Router screens
│   ├── (auth)/             # Login/signup flow
│   │   └── login.tsx
│   └── (main)/             # Main app screens
│       ├── index.tsx       # Agent Hub home screen
│       ├── chat/[id].tsx   # Chat with agent
│       ├── create/         # Onboarding interview
│       ├── settings/[id].tsx # Agent settings
│       └── profile.tsx     # User profile & preferences
├── components/
│   ├── slime/              # Slime character components
│   │   ├── InteractiveSlime.tsx  # Physics-enabled slime
│   │   ├── ProfileSlime.tsx      # Avatar slimes
│   │   ├── CoachSlime.tsx        # Fitness coach variant
│   │   └── Slime.tsx             # Base animated slime
│   ├── chat/               # Chat UI components
│   │   ├── MealAnalysisCard.tsx
│   │   ├── DailyProgressCard.tsx
│   │   ├── FinanceSummaryCard.tsx
│   │   ├── BillsCard.tsx
│   │   ├── SavingsGoalsCard.tsx
│   │   ├── BudgetBreakdownCard.tsx
│   │   ├── LogConfirmationCard.tsx
│   │   ├── BillConfirmationCard.tsx
│   │   ├── QuickActionsBar.tsx
│   │   └── QuickReplies.tsx
│   └── ui/                 # Shared UI components
│       ├── LogExpenseSheet.tsx
│       ├── AddIncomeSheet.tsx
│       ├── AddBillSheet.tsx
│       ├── AddSavingsGoalSheet.tsx
│       └── PhotoOptionsSheet.tsx
├── hooks/                  # Custom React hooks
│   ├── useAgent.ts         # Agent CRUD operations
│   ├── useChat.ts          # Chat messaging
│   ├── useFinance.ts       # Finance data & operations
│   ├── useBills.ts         # Recurring bills
│   ├── useMealLogging.ts   # Meal photo analysis
│   ├── useWorkoutLogging.ts
│   ├── useWaterLogging.ts
│   └── useNotifications.ts
├── context/                # React contexts
│   ├── AuthContext.tsx     # Authentication state
│   ├── ThemeContext.tsx    # Dark mode theming
│   └── ToastContext.tsx    # Toast notifications
├── lib/
│   ├── supabase.ts         # Supabase client & queries
│   ├── claude.ts           # Claude API integration
│   └── prompts/            # Agent system prompts
├── constants/
│   ├── colors.ts           # Light & dark color palettes
│   ├── theme.ts            # Spacing, typography
│   └── fonts.ts            # Font families
└── supabase/
    └── migrations/         # Database migrations
```

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Supabase account
- Claude API key (Anthropic)

### Installation

```bash
# Clone the repo
git clone https://github.com/danieljcheung/Squish.git
cd Squish

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### Environment Variables

Create a `.env` file with:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_CLAUDE_API_KEY=your_claude_api_key
```

### Database Setup

Run the migrations in your Supabase SQL editor in order:

1. `20240101000000_add_push_tokens.sql`
2. `20240102000000_add_finance_tables.sql`
3. `20240103000000_add_savings_wishlist.sql`
4. `20240104000000_fix_daily_finance_rls.sql`

### Run the App

```bash
npx expo start
```

Scan the QR code with Expo Go (iOS/Android) or press `i` for iOS simulator / `a` for Android emulator.

## Design

### Color Palette

Soft pastels that feel friendly and approachable:

| Color | Light | Dark | Use |
|-------|-------|------|-----|
| Background | `#f6f8f7` | `#0f1512` | App background |
| Surface | `#ffffff` | `#1a2520` | Cards, sheets |
| Primary | `#bae9d1` | `#bae9d1` | Buttons, accents |
| Text | `#101914` | `#f0f5f2` | Primary text |
| Muted | `#5b8b72` | `#7a9988` | Secondary text |

### Slime Colors

| Name | Hex | Agent Type |
|------|-----|------------|
| Mint | `#B8E8D0` | Default, Fitness |
| Lavender | `#D8B8E8` | Wellness |
| Peach | `#F8D8B8` | Lifestyle |
| Sky | `#B8D8F8` | Productivity |
| Lemon | `#F8F0B8` | Finance |

## Database Schema

```sql
-- Core Tables
users (id, email, created_at)
agents (id, user_id, type, name, persona_json, settings_json, created_at)
messages (id, agent_id, role, content, created_at)
agent_memory (id, agent_id, key, value, updated_at)

-- Finance Tables
expenses (id, agent_id, amount, category_id, description, expense_date)
income (id, agent_id, amount, category_id, description, income_date)
recurring_bills (id, agent_id, name, amount, frequency, due_day, is_subscription)
savings_goals (id, agent_id, name, target_amount, current_amount, deadline)
budgets (id, agent_id, category_id, amount, period)
daily_finance (id, agent_id, date, total_spent, total_income)

-- Categories
expense_categories (id, name, icon, is_default)
income_categories (id, name, icon, is_default)
```

## Roadmap

### Completed

- [x] Expo Router navigation with auth flow
- [x] Supabase authentication & database
- [x] Conversational onboarding interview
- [x] Chat UI with Claude AI integration
- [x] Push notifications system
- [x] Interactive slime with stress-ball physics
- [x] Flick momentum with wall bouncing
- [x] Fitness coach: meal photo analysis
- [x] Fitness coach: workout & water logging
- [x] Finance buddy: expense & income tracking
- [x] Finance buddy: recurring bills management
- [x] Finance buddy: savings goals
- [x] Finance buddy: budget breakdowns
- [x] Dark mode theming
- [x] Profile/account screen

### Planned

- [ ] Study buddy agent type
- [ ] Habit tracking agent
- [ ] Data export (CSV/PDF)
- [ ] Widgets for iOS/Android
- [ ] Apple Health / Google Fit integration
- [ ] Bank account linking (Plaid)
- [ ] Multi-language support

## Contributing

This is a portfolio/demo project. Feel free to fork and build your own version!

## License

MIT
