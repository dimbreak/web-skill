# battleship-with-web-skill

A Vite + React + TypeScript demo game that integrates `web-skill`.

## Tech Stack

- Vite
- React 19
- TypeScript
- Zustand
- Tailwind CSS 4
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
- `pnpm preview`: preview production build

## CI/CD (Vercel)

Deployment is handled by `.github/workflows/deploy-battleship-demo.yml`.

- Pull Request changes under `demos/battleship-with-web-skill/**` -> deploy **Preview**
- Push to `main` with changes under `demos/battleship-with-web-skill/**` -> deploy **Production**

Required repository secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID_BATTLESHIP`

## Contributing

- See `CONTRIBUTING.md`
- Follow `CODE_OF_CONDUCT.md`
- Security reports: `SECURITY.md`

## License

MIT, see `LICENSE`.
