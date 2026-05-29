# 2048-with-web-skill

A Vite + React + TypeScript demo game that integrates `web-skill`.

## Tech Stack

- Vite
- React 19
- TypeScript
- Zustand
- Tailwind CSS 3
- web-skill

## Requirements

- Node.js >= 20
- pnpm >= 10

## Quick Start

```bash
pnpm install
pnpm dev
```

## Scripts

- `pnpm dev`: run local dev server
- `pnpm lint`: run ESLint
- `pnpm build`: type-check + production build
- `pnpm check`: run lint + build
- `pnpm clean`: remove `node_modules` and `dist`
- `pnpm preview`: preview production build

## CI/CD (Vercel)

Deployment is handled by `.github/workflows/deploy-2048-demo.yml`.

- Pull Request changes under `demos/2048-with-web-skill/**` -> deploy **Preview**
- Push to `main` with changes under `demos/2048-with-web-skill/**` -> deploy **Production**

Required repository secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID_2048`

## Contributing

- See `CONTRIBUTING.md`
- Follow `CODE_OF_CONDUCT.md`
- Security reports: `SECURITY.md`

## License

MIT, see `LICENSE`.
