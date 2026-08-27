# Doctoralia Project — Agent Instructions

## 1. Project Overview

This is the Doctoralia Doctor Appointment Management System.

### Current Stack

* Frontend: React
* Backend: Node.js + Express
* Database: PostgreSQL
* API communication: HTTP/REST
* Package manager: npm

Follow the existing project architecture and conventions.

---

# 2. General Rules

* Inspect the existing code before making changes.
* Reuse existing functionality whenever possible.
* Do not create duplicate utilities, controllers, routes, middleware, or database connections.
* Do not change unrelated files.
* Keep changes as small and focused as possible.
* Do not rewrite working code without a clear reason.
* Do not introduce a new architecture unless explicitly requested.
* Do not expose secrets from `.env`.
* Do not commit passwords, API keys, tokens, or database credentials.

---

# 3. Library / Package Restrictions

## IMPORTANT

Do NOT install, remove, upgrade, or downgrade any npm package without asking for permission first.

Before suggesting a new package:

1. Check whether the existing project already has a library that can solve the problem.
2. Check whether the functionality can reasonably be implemented using existing dependencies or native functionality.
3. Explain why the new package is necessary.
4. Explain what the package will be used for.
5. Explain any important security, maintenance, or compatibility concerns.
6. Wait for my approval before installing it.

### Never automatically run:

* `npm install <package>`
* `npm uninstall <package>`
* `npm update`
* `npm install -g <package>`

unless I explicitly authorize it.

---

# 4. Review Before Changing

## THIS IS REQUIRED

Before modifying any file, first inspect the relevant existing code and provide a change plan.

The review must include:

### A. Problem

Explain what needs to be changed and why.

### B. Existing Implementation

Identify:

* Relevant files
* Relevant functions/components
* Existing routes
* Existing database queries
* Existing middleware
* Existing utilities that can be reused

Use actual file paths.

### C. Proposed Changes

List exactly:

* Which files will be modified
* Which files will be created
* Which files will be deleted, if any
* What will change in each file

### D. Dependencies

State whether any new package/library is required.

If yes, explain why and wait for approval.

### E. Risks

Mention possible:

* Breaking changes
* Database issues
* Authentication/authorization issues
* API compatibility issues
* Security concerns
* Side effects

### F. Testing Plan

Explain how the change will be tested.

## DO NOT MODIFY FILES DURING THIS REVIEW.

Wait for my approval before making changes.

---

# 5. After Approval

Only after I approve the proposed changes:

1. Make the minimum necessary changes.
2. Do not modify unrelated files.
3. Follow the existing coding style.
4. Reuse existing functions and utilities where appropriate.
5. Do not introduce unnecessary dependencies.
6. Do not change the database schema unless explicitly approved.
7. Do not modify `.env` values.
8. Do not remove existing functionality unless explicitly requested.

---

# 6. Change Summary

After making changes, ALWAYS provide a concise summary.

Use this structure:

## Changes Made

### Modified

* `path/to/file.js`

  * Explain what changed and why.

### Created

* `path/to/file`

  * Explain its purpose.

### Deleted

* `path/to/file`

  * Explain why it was deleted.

## Behavior Change

Explain:

* What the system did before
* What it does now
* Why the behavior changed

## Dependencies

State:

* No new dependencies were added

OR

* Package added: `<package-name>`
* Why it was necessary

## Important Notes

Mention any assumptions, limitations, or possible issues.

---

# 7. API Development Rules

When creating or modifying an API endpoint, inspect:

* Route
* Controller
* Middleware
* Database queries
* Authentication/authorization
* Existing API response format

Maintain consistency with existing APIs.

For every API change, document:

* HTTP method
* Endpoint
* Authentication requirement
* Request parameters
* Request body
* Success response
* Error responses
* Validation rules

---

# 8. API Tester File

## REQUIRED FOR NEW OR MODIFIED APIs

Whenever creating or significantly modifying an API endpoint, create or update an API testing file that can be used to test the endpoint.

Prefer the project's existing API testing format if one already exists.

If no API testing format exists, use a simple `.http` file compatible with REST Client-style API testing.

Example:

```http
### Create Appointment
POST http://localhost:5000/api/appointments
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "hospital_id": 1,
  "schedule_id": 1
}
```

Include separate requests for important cases, such as:

```text
### Successful request

### Missing required field

### Invalid ID

### Unauthorized request

### Duplicate request

### Not found

### Invalid input
```

Do NOT put real passwords, tokens, API keys, or secrets in the API tester file.

Use placeholders such as:

```text
YOUR_TOKEN
YOUR_ID
YOUR_VALUE
```

---

# 9. API Testing Summary

After implementing an API, provide:

## API Test File

Give the path to the test file.

Example:

`server/tests/appointments.http`

## Test Cases

List the important test cases included.

Example:

* Valid appointment creation
* Missing `hospital_id`
* Missing `schedule_id`
* Invalid schedule
* Unauthorized request
* Duplicate appointment
* Full schedule

## Expected Results

Explain the expected HTTP status and important response for each test.

---

# 10. Database Rules

Before changing database-related code:

* Inspect the existing schema.
* Inspect foreign-key relationships.
* Inspect existing queries.
* Check whether the required data already exists in another table.
* Reuse existing database connection/pool configuration.

Do not:

* Drop tables
* Delete data
* Change columns
* Change constraints
* Change primary keys
* Change foreign keys

without explicit approval.

For database changes, explain the impact before making the change.

---

# 11. Error Handling

When debugging an error:

1. Reproduce or inspect the error.
2. Identify the root cause.
3. Inspect the relevant code.
4. Explain the root cause.
5. Propose a fix.
6. Wait for approval if the fix requires modifying files.
7. Implement the fix.
8. Test the fix.

Do not hide errors simply to make the application appear to work.

Do not replace meaningful errors with generic success responses.

---

# 12. Security

Never expose or print:

* Database passwords
* JWT secrets
* API keys
* Authentication tokens
* `.env` values
* Private credentials

Be careful with:

* SQL injection
* Authentication
* Authorization
* Password handling
* User input validation
* File uploads
* Sensitive API responses

If a requested change creates a security concern, explain it before implementing it.

---

# 13. Code Quality

Prefer:

* Simple solutions
* Existing project patterns
* Small functions
* Clear variable names
* Proper error handling
* Parameterized SQL queries
* Reusable code

Avoid:

* Unnecessary abstractions
* Duplicate code
* Unused imports
* Dead code
* Unnecessary packages
* Large unrelated refactors

---

# 14. Testing After Changes

After implementation, test the affected functionality.

If possible, run the relevant:

* Backend tests
* Frontend tests
* API tests
* Linting
* Build commands

Report exactly what was tested.

Do not claim something works unless it was actually verified.

Use this format:

## Verification

* Command/test: `<command>`
* Result: PASS / FAIL
* Notes: `<important information>`

If something could not be tested, clearly say so.

---

# 15. Git Awareness

Before large changes, inspect the current Git state.

Do not:

* Delete branches
* Force push
* Reset commits
* Rewrite Git history
* Discard user changes

without explicit approval.

Never overwrite existing uncommitted user work.

If unrelated uncommitted changes exist, do not modify or remove them.

---

# 16. Communication Style

I am learning the technologies used in this project.

When making important changes:

* Explain what you are doing.
* Explain why you are doing it.
* Use the actual project file paths.
* Avoid unnecessary jargon.
* Point out important concepts I should learn.
* If there are multiple reasonable approaches, briefly compare them.

Do not assume I understand a change simply because the code compiles.

---

# 17. Required Workflow

For every non-trivial task, follow this workflow:

```text
1. Inspect
   ↓
2. Understand existing implementation
   ↓
3. Review findings
   ↓
4. Propose changes
   ↓
5. Wait for approval
   ↓
6. Implement
   ↓
7. Test
   ↓
8. Create/update API tester file if applicable
   ↓
9. Review final changes
   ↓
10. Give change summary
```

## Most Important Rule

**DO NOT MODIFY PROJECT FILES BEFORE COMPLETING THE REVIEW AND RECEIVING APPROVAL.**
** Everytime you modify schema 
tell me what you have modify in schema_modification.txt , what should I do for erd in erd_guide.txt

