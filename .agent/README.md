# Frontend Agent Rules

This `.agent` folder is scoped to the React frontend only. Read it after the
root `.agent` files whenever a task touches `frontend/`.

## Scope

- React, Vite, TypeScript.
- Tailwind CSS and shadcn-style local primitives.
- React Router DOM routes.
- TanStack Query server state.
- TanStack Table data grids.
- React Hook Form plus Zod forms.
- Sonner notifications through `src/lib/toast.ts`.
- `react-alert-confirm` confirmations through `src/lib/confirm.ts`.

## Required Read Order

1. Root `.agent/ARCHITECTURE.md`.
2. Root `.agent/rules/HRM.md`.
3. Root workflow file for the task.
4. `frontend/.agent/README.md`.
5. `memory.md`.

## Frontend Structure

```text
frontend/src/
├── components/
│   ├── common/
│   ├── form/
│   ├── layout/
│   ├── table/
│   ├── modal/
│   ├── drawer/
│   └── charts/
├── features/
│   ├── auth/
│   ├── employees/
│   ├── attendance/
│   ├── payroll/
│   ├── bank-transfer/
│   ├── dashboard/
│   ├── roles-permissions/
│   └── reports/
├── hooks/
├── services/
├── routes/
├── schemas/
├── types/
├── utils/
├── constants/
├── lib/
└── store/
```

## Frontend Rules

- Keep pages thin. Put API calls in `features/<module>/*.service.ts`.
- Put server-state orchestration in hooks when it grows beyond a page.
- Put form validation in Zod schemas, not inline event handlers.
- Use reusable `components/form/*` controls for all forms.
- Use `src/lib/toast.ts` for all user notifications.
- Use `src/lib/confirm.ts` for all important confirmations.
- Never use `window.confirm`, `alert()`, or component-local duplicate toast logic.
- Every table must support loading, error, empty state, sticky header, and horizontal scroll.
- Every protected action must check permissions in UI.
- Every delete or lock action must confirm before API mutation.
- Keep each file under 700 lines.

## UI Rules

- Enterprise ERP style: dense, clean, operational, easy to scan.
- Desktop uses fixed sidebar.
- Tablet uses collapsible sidebar.
- Mobile uses drawer navigation.
- Support light and dark mode through CSS variables.
- Use Lucide React icons in buttons where possible.
