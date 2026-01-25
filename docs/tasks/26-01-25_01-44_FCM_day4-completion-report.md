# Day 4 Completion Report - Sprint 4

**Date:** 26-01-25  
**Time:** 01:44 AM (ART)  
**Type:** DevOps  
**Status:** ✅ Completed

---

## Tasks Completed ✅

### [SETUP] Configurar Playwright en CI

- ✅ Modified `.github/workflows/ci.yml`
- Added a new `e2e-tests` job.
- **Matrix Strategy:** Parallelized tests across 3 browsers: `chromium`, `firefox`, and `webkit`.
- **Browsers Installation:** Added `npx playwright install --with-deps` step to ensure all binary dependencies are present in the GitHub runner.
- **Fail-Fast Disabled:** Set `fail-fast: false` to ensure that if one browser fails, tests still run for the others.

### [CODE] Añadir upload de artifacts

- ✅ Integrated `actions/upload-artifact@v4`.
- **Reports:** Automated HTML report uploading for each browser.
- **Failure Analysis:** Configured to upload artifacts on every run (`if: always()`), including screenshots and traces for failed tests (as defined in `playwright.config.ts`).
- **Retention:** Reports are kept for 30 days.

---

## Files Modified

1. `.github/workflows/ci.yml` - Added `e2e-tests` job with parallel matrix and artifact uploading.

---

## Next Steps (Day 5)

Tomorrow's focus is **Performance and Quality Monitoring**:

- Installing Lighthouse CI (`@lhci/cli`).
- Creating `lighthouserc.json` with performance budgets.
- Adding a dedicated `lighthouse` job to the CI pipeline to ensure scores stay above 90.

---

**Status:** Day 4 complete. The project now has a professional E2E testing pipeline in CI, providing high confidence for every pull request and push to the main branch.
