# KodloHUB

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
## Brat TD web embed

The playable browser build is a static Vite SPA from `brat-td-desktop`, published into `public/brat-td/`.

```bash
# from brat-td-desktop/
npm run publish:web
```

Then open `/tools/brat-td` (iframe) or `/brat-td/` (fullscreen). Re-run `publish:web` after game updates — do not fork game logic inside kodlohost.

### Hub auth + progress

- Pairing: same `ka_live_` tokens as HALF BRAT (`/api/arena/pair/*`, confirm UI at `/brat-td/link`).
- Progress API: `GET/PATCH/POST /api/v1/games/brat-td` (Bearer `ka_live_…`).
- Version for Hammer Launcher: `GET /api/brat-td/version` (env `BRAT_TD_CLIENT_VERSION`, `BRAT_TD_DOWNLOAD_*`).

## Hammer Launcher: self-update manifest

`GET /api/launcher/version` is the public manifest used by the desktop Hammer Launcher. It is intentionally configured through deployment environment variables, so release URLs and SHA-256 hashes are never baked into source code.

| Variable | Meaning |
| --- | --- |
| `HAMMER_LAUNCHER_VERSION` | Published launcher version, for example `0.3.1`. |
| `HAMMER_LAUNCHER_RELEASE_NOTES` | Short release notes shown in the launcher. |
| `HAMMER_LAUNCHER_DOWNLOAD_WINDOWS` | HTTPS URL to the Windows ZIP release. |
| `HAMMER_LAUNCHER_SHA256_WINDOWS` | SHA-256 of that Windows ZIP. |
| `HAMMER_LAUNCHER_DOWNLOAD_LINUX` | HTTPS URL to the Linux ZIP release. |
| `HAMMER_LAUNCHER_SHA256_LINUX` | SHA-256 of that Linux ZIP. |

The ZIP must contain the launcher build at its root (for example `Hammer Launcher.exe` for Windows), not inside an extra directory. Do not raise `HAMMER_LAUNCHER_VERSION` until the matching package URLs and hashes are deployed: the client refuses packages without a 64-character SHA-256.
