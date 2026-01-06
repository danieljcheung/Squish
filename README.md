# Squish

A mobile app that lets anyone create personalized AI coaching agents through friendly conversation. Each agent is an anime-style slime character that transforms into a specialized persona to help users with specific goals.

![React Native](https://img.shields.io/badge/React_Native-Expo-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Supabase](https://img.shields.io/badge/Backend-Supabase-green)
![Claude](https://img.shields.io/badge/AI-Claude_API-purple)

## Vision

Most people can't create AI agents because the setup is intimidating. Squish solves this by interviewing users in plain conversation, then generating a personalized agent behind the scenes.

The slime mascot makes AI feel approachable and fun rather than cold and technical.

## Features

### MVP: Fitness Coach
A slime that helps with workouts and diet.

- **Onboarding Interview** — Conversational setup that learns your goals, schedule, and preferences
- **Workout Planning** — Weekly plans based on your equipment and fitness level
- **Diet Coaching** — Meal logging with feedback and suggestions
- **Check-ins & Notifications** — Morning motivation, meal reminders, progress summaries
- **Coaching Styles** — Choose between tough love, gentle encouragement, or balanced

### Coming Soon
- Budget Helper — Track spending and savings goals
- Study Buddy — Study schedules and learning support

## Tech Stack

| Layer | Technology |
|-------|------------|
| Mobile | Expo (React Native) |
| Backend | Supabase |
| AI | Claude API (Sonnet) |
| Notifications | Expo Push Notifications |

## Project Structure

```
squish/
├── app/                    # Expo Router screens
│   ├── (auth)/             # Login flow
│   └── (main)/             # Main app
│       ├── index.tsx       # Home/Agent Hub
│       ├── chat/[id].tsx   # Chat with agent
│       ├── create/         # Onboarding interview
│       └── settings/       # Agent settings
├── components/
│   ├── slime/              # Slime character components
│   ├── chat/               # Chat UI components
│   └── ui/                 # Shared UI components
├── lib/
│   ├── supabase.ts         # Supabase client
│   ├── claude.ts           # Claude API wrapper
│   └── prompts/            # Agent system prompts
├── hooks/                  # React hooks
├── types/                  # TypeScript definitions
└── constants/              # Colors, agent configs
```

## Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI
- Supabase account
- Claude API key

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

### Run the App

```bash
npx expo start
```

## Design

### Color Palette
Soft pastels that feel friendly and approachable:

| Color | Hex | Use |
|-------|-----|-----|
| Mint | `#B8E8D0` | Primary, base slime |
| Lavender | `#E8D0E8` | Accents |
| Peach | `#F8E0D0` | Warm highlights |
| Sky Blue | `#D0E8F8` | Info states |
| Cream | `#FFF8F0` | Background |

### Slime Characters
- **Base Slime** — Simple, cute blob that greets new users
- **Coach Slime** — Buff slime with headband for fitness coaching
- More personas coming soon!

## Database Schema

```sql
-- Users
users (id, email, created_at)

-- Agents
agents (id, user_id, type, name, persona_json, settings_json, created_at)

-- Messages
messages (id, agent_id, role, content, created_at)

-- Agent Memory
agent_memory (id, agent_id, key, value, updated_at)
```

## Roadmap

- [x] Project setup with Expo Router
- [x] Basic navigation structure
- [x] Supabase auth integration
- [x] Onboarding interview flow
- [x] Chat UI with Claude integration
- [x] Push notifications
- [ ] Slime animations
- [ ] Additional agent types

## Contributing

This is a portfolio/demo project. Feel free to fork and build your own version!

## License

MIT
