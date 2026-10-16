# Definition of Done

A story is Done only when ALL of these are true:

- [ ] Code reviewed by a second person and merged through a PR with passing CI
- [ ] Acceptance criteria tested, including forbidden-role cases
- [ ] Works on a 360 px phone and on a computer
- [ ] Server-side permission checks and Zod validation in place
- [ ] No secrets, no known security issue, no stack traces exposed
- [ ] Database migration included (if the schema changed)
- [ ] Docs updated (API contract, permissions) if behaviour changed
- [ ] Deployed to staging and shown to the team
