This is a [Next.js](https://nextjs.org) project for Dongple, a neighborhood tourism and realtime local-sharing service.

## Getting Started

First, configure environment variables:

```bash
cp .env.local.example .env.local
```

Required keys:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`
- `NAVER_CLIENT_SECRET`
- `TOURAPI_KEY`

Then run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open your configured local port, typically [http://localhost:3001](http://localhost:3001), with your browser to see the result.

Main public-data integration points:

- `src/app/api/tour/events/route.ts`
- `src/services/eventService.ts`
- `src/features/events/components/OfficialEventSection.tsx`
- `src/app/events/page.tsx`
- `src/app/map/page.tsx`

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
