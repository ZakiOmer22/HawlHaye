# GitHub setup checklist (Ridwan + Zacki, Day 1)

Do these in the GitHub web UI (they cannot be stored in the repo):

1. Create the repository (private) under the College/University or team organisation, not a personal account.
2. Create branches: `main`, `develop`. Default branch: `develop`.
3. Branch protection on `main` AND `develop`: require pull request, require 1 approval, dismiss stale approvals, require status check `checks` (CI), block force pushes, restrict deletions.
4. Settings > Code security: enable Dependabot alerts and secret scanning (and push protection if available).
5. Merge options: allow squash merging only; auto-delete head branches.
6. Add all six members; give write access (not admin) except the Tech Lead and Ridwan.
7. Environments: `staging` (auto from `develop`), `production` (required reviewer: Zacki) for deploy workflows.
8. Labels: `story`, `bug`, `security`, `blocked`, `needs-review`, `P1-critical`, `P2-high`, `P3-normal`, `backend`, `frontend`, `database`, `infra`, `docs`.
9. Project board with columns: Backlog, This sprint, In progress, In review, Done.
10. Replace placeholder handles in `.github/CODEOWNERS`.
