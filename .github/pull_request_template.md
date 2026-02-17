## Summary

-

## Scope

- [ ] Non-admin changes only (or admin impact clearly documented)
- [ ] Existing UI visual style preserved unless explicitly requested

## Shadcn Migration Checklist

- [ ] New overlay/sheet/modal behavior uses shared primitives (`ui/dialog` / `ui/sheet`)
- [ ] No new ad-hoc fullscreen overlay shell introduced
- [ ] Legacy behavior (close rules, keyboard, scroll lock) preserved or explicitly documented

## Theme & Color Guard

- [ ] No new hardcoded neutral colors in non-admin paths (`slate/gray/zinc/neutral/stone/black/white`)
- [ ] `npm run color:guard` passes

## Validation

- [ ] `npm run lint`
- [ ] `npm run typecheck:src`
- [ ] `npx vite build`

## Risks / Notes

-
