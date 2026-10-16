# Workflow

Source of truth in code: `packages/shared/src/workflow.ts` (with tests). This table mirrors it.

| From | To | Who | Required |
| --- | --- | --- | --- |
| Unassigned | Assigned | Dean, Deputy | Owner, priority, due date |
| Assigned | In Progress | Owner, delegate | - |
| In Progress | Blocked | Owner, delegate | Reason |
| Blocked | In Progress | Owner, Dean, Deputy | Resolution note |
| In Progress | Review | Owner | Completion note |
| Review | Completed | Dean, Deputy | - |
| Review | In Progress | Dean, Deputy | Return comment |
| Assigned / In Progress / Blocked | Unassigned | Dean, Deputy | Reason (reassign) |

Rules: one accountable owner per task; delegation never removes accountability; **Overdue is a computed flag, not a status**; completed tasks are never deleted; every change is written to the task history.
