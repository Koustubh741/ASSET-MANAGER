# Test Accounts Reference

Accounts created for workflow testing (BYOD, asset requests, etc.).

| Email | Password | Role | Department | Domain |
|-------|----------|------|------------|--------|
| koustubh@gmail.com | password@123 | — | — | — |
| JohnathanPine@gmail.com | password@123 | Manager | Engineering | DATA_AI |
| richardroper@gmail.com | password@123 | IT Management | IT Management | Infrastructure |

## BYOD Workflow Quick Reference

1. **End User** (submit request): koustubh@gmail.com or JohnathanPine@gmail.com *(if End User)*
2. **Manager** (approve): JohnathanPine@gmail.com
3. **IT Admin** (approve & register): richardroper@gmail.com

## Notes

- **richardroper@gmail.com** must have role `IT_MANAGEMENT` in the database to see pending requests in the Technician Workbench
- Login at `/login` → after login you'll be routed to the dashboard matching your role
