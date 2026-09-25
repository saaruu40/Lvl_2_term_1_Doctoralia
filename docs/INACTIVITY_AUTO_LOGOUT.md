# Inactivity Status & Auto Logout — Doctoralia

> Separate doc as requested: how inactivity works, how to API-test it, how auto-logout works, and why 2nd login requires 1st logout.

---

## 1. How Inactivity Status Works

### 1.1 Hook — `client/src/hooks/useInactivityLogout.js:1-49`

```js
export default function useInactivityLogout(onLogout, timeoutMs = 5 * 60 * 1000)
```

- Default `5 min` (`5*60*1000`). Used identically in 4 dashboards:
  - `client/src/pages/AdminDashboard.jsx:81-92` `useInactivityLogout(handleInactivityLogout, 5*60*1000)`
  - `client/src/pages/DoctorDashboard.jsx:464` same
  - `client/src/pages/StaffDashboard.jsx:52-61` same
  - `client/src/pages/PatientDashboard.jsx:839` same
- Listens `mousemove,mousedown,click,keydown,scroll,touchstart` (`useInactivityLogout.js:36`).
- `mousemove` throttled `3s` (`useInactivityLogout.js:29` `if Date.now()-lastReset <3000 return`) to avoid spam; other events reset immediately.
- `resetTimer()` (`useInactivityLogout.js:13`): `clearTimeout(prev)` + `setTimeout(onLogout, timeoutMs)`. Called on mount + every (throttled) event. Cleanup on unmount removes listeners and timer.

```
events ──► throttledReset ──► resetTimer ──► 5 min no activity ──► onLogout()
  │                    ▲                              │
  └──── activity ──────┘                              ▼
                                              handleInactivityLogout
```

No backend `last_active` column / trigger — frontend UX only (`AUTH-SUMMARY.md:179`, `LEARN_BACKEND.md:109`).

### 1.2 What `onLogout` Does (per dashboard)

`AdminDashboard.jsx:81-91` (others identical, redirect differs):

```js
const handleInactivityLogout = useCallback(() => {
  localStorage.removeItem("admin");
  localStorage.removeItem("doctor");
  localStorage.removeItem("staff");
  localStorage.removeItem("patient");
  localStorage.removeItem("token");          // shared JWT
  localStorage.setItem("inactive_logout","1"); // one-time flag
  document.body.style.overflow="auto";
  window.location.replace("/login"); // doctor→/doctor-login, staff→/staff-login, patient→/patient-login
}, []);
```

Manual `logout()` (`AdminDashboard.jsx:690`, `StaffDashboard.jsx:42`, etc.) clears same keys **without** setting `inactive_logout`.

### 1.3 `inactive_logout` Banner

Logins read it once (`AdminLogin.jsx:18-23`, `DoctorLogin.jsx:18-23`, `StaffLogin.jsx:17-24`, `PatientLogin.jsx:17-24` identical):

```js
useEffect(()=>{
  if(localStorage.getItem("inactive_logout")==="1"){
    setInactiveMsg("You have been logged out due to inactivity.");
    localStorage.removeItem("inactive_logout");
  }
},[]);
```

Rendered in `DoctorLogin.jsx:177/198` etc. as `doctor-message error`. One-time — reload clears it.

---

## 2. Auto Logout System

| Layer | What enforces | Where |
|---|---|---|
| **Frontend inactivity** | 5 min idle → clear storage → redirect → banner | `useInactivityLogout.js:6` + 4 dashboards |
| **Frontend guard** | No token/role → redirect to role login | `client/src/components/ProtectedRoute.jsx:7-40`, `client/src/App.jsx:80-150` |
| **Backend JWT** | `expiresIn 1d`, `jwt.verify` → `401 Invalid or expired token` | `server/middleware/authMiddleware.js:24`, signing `adminController.js:128`, `doctorController.js:303`, `patientController.js:176`, `staffController.js:325` |

**Important:** inactivity does **not** invalidate JWT on server. After auto-logout, old token technically still valid until `1d` — but frontend discards it, so next API call has no `Authorization`. `roleMiddleware.js:5` adds `403 Access denied` for role mismatch.

Backend has **no** inactivity table/trigger (`grep inactive|INACTIVITY` only frontend).

---

## 3. How to API-Test Inactivity / Auto Logout

### 3.1 Manual UX Test (primary)

1. Login: `POST /api/admin/login` or `POST /api/doctors/login` → copy `token` → open dashboard (`/admin-dashboard`, `/doctor-dashboard`, etc.).
2. Wait `5 min` without `mousemove/click/keydown/scroll/touchstart` → auto-redirect to `/login` (or `/doctor-login`) → banner `You have been logged out due to inactivity.`
3. Move mouse / click within `5 min` → timer resets → stays logged in.
4. Click manual `Logout` → redirect **without** banner.
5. Refresh login after banner → banner disappears (one-time `removeItem`).

Dev shortcut: temporarily change `useInactivityLogout(handleInactivityLogout, 10*1000)` (10s) in any dashboard, rebuild (`npm --prefix client run build`), repeat steps.

### 3.2 API-Level Tests (with `server/apiTester/*.http` or curl)

No dedicated `GET /api/inactivity` endpoint — test via `authMiddleware` + storage behavior.

**A. Without token → 401** (all dashboards, also `doctor.http:387`, `admin.http`, `staff.http`, `patient.http` already have this smoke):

```http
GET http://localhost:5000/api/doctors/profile
# No Authorization
# Expected 401 { message: "No token provided" }  — authMiddleware.js:8
```

```bash
curl -i http://localhost:5000/api/doctors/profile
# 401
```

**B. With valid token within 5 min → 200:**

```http
GET http://localhost:5000/api/doctors/profile
Authorization: Bearer {{doctorToken}}
# Expected 200 { doctor: { ... } }
```

**C. After inactivity redirect (frontend cleared token) → 401 again:**

```http
GET http://localhost:5000/api/admin/dashboard/stats
# No Authorization after auto-logout
# Expected 401
```

**D. Old token still valid on server until 1d (proves frontend-only):**

```bash
curl -i -H "Authorization: Bearer <token-copied-before-inactivity>" http://localhost:5000/api/admin/dashboard/stats
# 200 until 1d expiry, even though frontend logged out — expected, by design
```

**E. Cross-role after inactivity → 403:**

```http
GET http://localhost:5000/api/notifications/doctor/1
Authorization: Bearer {{adminToken}}
# Expected 403 Access denied (roleMiddleware) or 403 ownership (notificationController.js:15)
```

Add to `server/apiTester/inactivity.http` (see `docs/INACTIVITY_AUTO_LOGOUT.md` companion file) or reuse existing `11. Frontend Auth` sections in `doctor.http:380`, `patient.http`, `staff.http`, `admin.http`.

### 3.3 Automated Run

- REST Client (VS Code): open `server/apiTester/inactivity.http` → `Send Request` for cases A-E.
- `client build`: `npm --prefix client run build` → check no `inactive_logout` regression.
- `server`: `node server/server.js` → `GET /api/test-db` `200`.

---

## 4. If More Than One Time Login — Wanting First Logout

### 4.1 Single Shared Token Design

- Storage keys: single `localStorage.getItem("token")` (shared JWT) + one role object `admin`|`doctor`|`staff`|`patient` (`AdminLogin.jsx:81`, `DoctorLogin.jsx:119`, `StaffLogin.jsx:80`, `PatientLogin.jsx:80`). No `adminToken`/`doctorToken` separation.
- `ProtectedRoute.jsx:7-14` checks `hasAdmin||hasDoctor||hasStaff||hasPatient` + `token`.

### 4.2 Already-Logged-In Block

All logins identical (`AdminLogin.jsx:23-36`, `DoctorLogin.jsx:25-36`, etc.):

```js
const token = localStorage.getItem("token");
const alreadyLoggedIn = !!token && (!!localStorage.getItem("admin") || !!localStorage.getItem("doctor") || !!localStorage.getItem("staff") || !!localStorage.getItem("patient"));
if (alreadyLoggedIn) return (
  <div>You are already logged in. Please logout first.
    <button onClick={handleAlreadyLogout}>Logout</button>
  </div>
);
const handleAlreadyLogout = () =>{
  localStorage.removeItem("token");
  localStorage.removeItem("admin");
  localStorage.removeItem("doctor");
  localStorage.removeItem("staff");
  localStorage.removeItem("patient");
  localStorage.removeItem("inactive_logout");
  window.location.reload();
};
```

Flow:

```
1st login (e.g. admin) → token+admin stored → dashboard open
Try 2nd login (e.g. /doctor-login while token exists) → alreadyLoggedIn=true → blocked UI → must click Logout
Logout → clears all → reload → form renders → 2nd login succeeds
```

Same tab, same browser, same `localStorage` — intentionally prevents session stacking. Different browser/incognito = separate storage → independent (expected).

### 4.3 Inactivity + Multi-Login Interaction

- Inactivity `handleInactivityLogout` clears all keys and sets `inactive_logout=1` → next login attempt sees banner + no `alreadyLoggedIn` block (since token cleared).
- Manual `Logout` clears without banner. Both allow immediate re-login as any role.

### 4.4 Future (not implemented)

For real backend single-session enforcement, add `last_active` or `session_id` column + `UPDATE last_active` middleware + `401 Session expired due to inactivity` if `now - last_active > 5m`. Current spec keeps `expiresIn 1d` only.

---

## 5. File References

- Hook: `client/src/hooks/useInactivityLogout.js:1`
- Dashboards: `client/src/pages/AdminDashboard.jsx:81`, `DoctorDashboard.jsx:464`, `StaffDashboard.jsx:52`, `PatientDashboard.jsx:839`
- Logins: `client/src/pages/AdminLogin.jsx:18`, `DoctorLogin.jsx:18`, `StaffLogin.jsx:17`, `PatientLogin.jsx:17` + `alreadyLoggedIn` `23`
- Auth: `server/middleware/authMiddleware.js:3`, `server/middleware/roleMiddleware.js:1`
- Router: `client/src/App.jsx:80`, `client/src/components/ProtectedRoute.jsx:6`
- Docs: `AUTH-SUMMARY.md:179`, `LEARN_BACKEND.md:109`, `FILE_REVIEWS.md:78`

## 6. Quick Checklist

- [ ] Login → idle 5m → redirect + banner
- [ ] Activity resets → no redirect
- [ ] `GET /api/**/profile` without token → 401
- [ ] Try 2nd login while 1st active → `already logged in` block → Logout → login succeeds
- [ ] `vite build` passes

