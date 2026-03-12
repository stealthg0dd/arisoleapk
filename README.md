# Arisole StrideIQ

A premium wellness app for AI-powered gait analysis, built with React Native (Expo) and designed with a "Tech-Chic" aesthetic.

![Arisole StrideIQ](https://via.placeholder.com/1200x630/F26F05/FFFFFF?text=Arisole+StrideIQ)

## Features

### 🎯 Core Features
- **AI Gait Analysis**: Record a 20-second walk and receive comprehensive biomechanical feedback
- **Performance Tracking**: View your Gait Score and track improvements over time
- **Social Feed**: Share achievements with the community via trading card-style posts
- **Achievement System**: Unlock metallic badges and rewards for milestones

### 📱 Screens
1. **Splash Screen** - Animated brand introduction with floating logo
2. **Dashboard** - Performance ring, quick stats, and "Record My Walk" CTA
3. **Recording Flow** - Pro-tips grid and camera integration with 20s timer
4. **Insight Terminal** - Dark-mode analysis results with neon gauges
5. **Social Feed** - Trading card layout for community achievements
6. **Profile** - Glassmorphism settings and activity history

## Tech Stack

- **Frontend**: Expo SDK 55, TypeScript, React Native
- **Styling**: NativeWind v4 (TailwindCSS)
- **Navigation**: Expo Router (file-based)
- **Animations**: React Native Reanimated
- **Backend**: Supabase (Auth, Storage, Database)
- **AI Analysis**: Claude API (via Supabase Edge Functions)

## Design System

### Colors
```css
--arisole-orange: #F26F05
--arisole-peach: #FFCBA4
--metallic-gold: #D4AF37
--bg-light: #F9F9F9
--terminal-bg: #0D0D0D
```

### Components
- 24px rounded corners
- Glassmorphism effects with blur and translucent borders
- Orange-to-peach gradients
- Soft shadows and glow effects

## Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI
- Supabase account
- Claude API key (for AI analysis)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-repo/arisole-strideiq.git
cd arisole-strideiq
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your Supabase and Google OAuth credentials
```

4. Set up Supabase:
- Create a new Supabase project
- Run the SQL schema from `supabase/schema.sql`
- Create a storage bucket named "videos"
- Deploy the edge function from `supabase/functions/analyze-gait`

5. Start the development server:
```bash
npm start
```

### Running on Device

```bash
# Android
npm run android

# iOS
npm run ios
```

## Project Structure

```
arisole-strideiq/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab navigation screens
│   │   ├── index.tsx      # Dashboard
│   │   ├── feed.tsx       # Social feed
│   │   ├── achievements.tsx
│   │   └── profile.tsx
│   ├── recording/         # Recording flow
│   │   ├── index.tsx      # Pro-tips
│   │   └── camera.tsx     # Camera screen
│   ├── analysis/
│   │   └── [id].tsx       # Analysis terminal
│   └── _layout.tsx        # Root layout
├── components/            # Reusable components
│   ├── SplashScreen.tsx
│   └── GlassCard.tsx
├── context/               # React contexts
│   └── AuthContext.tsx
├── services/              # API services
│   ├── supabase.ts
│   └── videoAnalysis.ts
├── supabase/              # Supabase configuration
│   ├── functions/
│   │   └── analyze-gait/
│   └── schema.sql
├── tailwind.config.js
├── metro.config.js
└── app.json
```

## API Integration

### Claude AI Analysis
The app uses Claude API (via Supabase Edge Functions) to analyze walking videos. The analysis includes:
- **Gait Score**: Overall walking quality (0-100)
- **Impact Force**: Force generated during foot strike
- **Heel Strike**: Foot contact pattern quality
- **Posture Analysis**: Trunk and head alignment
- **Cadence**: Steps per minute
- **Symmetry**: Left-right balance

### Supabase Services
- **Authentication**: Google OAuth
- **Storage**: Video file uploads
- **Database**: User profiles, analyses, feed posts, achievements

## Deployment

### Android APK
```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build APK
eas build --platform android --profile preview
```

### Production Build
```bash
eas build --platform android --profile production
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google OAuth web client ID |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Google OAuth Android client ID |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software owned by Arisole.

## Support

For support, email support@arisole.com or join our Slack channel.

---

Built with ❤️ for better health by the Arisole Team
