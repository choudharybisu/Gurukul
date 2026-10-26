# Home Gurukul Break Ledger — Django REST Framework + React

This is the updated Django/React source for the reviewed break ledger. It retains the original break presets and ₹10 weekly donation ledger, and adds:

- Daily attendance tick; after 9:00 AM IST a reason is required before the ledger can be used.
- A mandatory reason when a running break passes its allowance by more than one minute.
- Off-from-studies start/return tick at the bottom, today's total, and the current off-study session counting up in the **main circular timer**.
- Today-only completed break history.
- A separate `/reports` page for week or month routine details and an Excel workbook (daily routine and break details sheets).

Django calculates elapsed time, fines, attendance status, reasons, daily totals, and report rows. React animates the display from saved timestamps. Reloading the page does not reset a running session. Times and day boundaries use Asia/Kolkata.

## Run locally on Windows

Requires Python 3.10+ and Node 20.19+ or 22.12+.

Terminal 1, from this folder:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
cd backend
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 127.0.0.1:8000
```

If you already have a database/user, skip `createsuperuser`. In terminal 2, from this folder:

```powershell
cd frontend
npm ci
npm run dev
```

Open `http://127.0.0.1:5173/`, sign in, and use `Reports` for Excel export. The Vite dev server proxies `/api/` to Django. The session and CSRF cookies remain same-origin through that proxy. For a different development origin, set `DJANGO_CSRF_TRUSTED_ORIGINS` accordingly.

## Update an existing PythonAnywhere installation

1. Back up your current `backend/db.sqlite3` and existing project files.
2. Upload the changed `backend/breaks/` files, including migration `0002_...py`, and the changed frontend files.
3. Activate your existing virtual environment. In `backend`, run `python manage.py migrate`.
4. In `frontend`, run `npm ci` and `npm run build` on a machine with Node. Upload the new `frontend/dist` into the frontend directory your site serves, preserving same-origin routing for `/api/` and `/reports`.
5. Reload the PythonAnywhere web app. If your setup serves assets via Django staticfiles, run `python manage.py collectstatic --noinput` as your configuration requires.

This ZIP does not contain your live database, secrets, virtual environment, or compiled frontend assets. The private preview site uses separate records and does not update your PythonAnywhere deployment.

## API overview

All endpoints require Django session authentication except session/login. Mutations use CSRF. Success responses contain `data` and `message`; errors contain `error`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/auth/session/` | Login state and CSRF cookie |
| POST | `/api/auth/login/` | Sign in |
| POST | `/api/auth/logout/` | Sign out |
| GET / POST | `/api/breaks/` | Dashboard / start preset break |
| POST | `/api/breaks/return/` | Check in from break |
| POST | `/api/breaks/reason/` | Record required overrun reason |
| POST | `/api/attendance/` | Mark attendance with optional or required reason |
| POST | `/api/off-study/` | Start off-study timer |
| POST | `/api/off-study/return/` | Return to studies |
| GET | `/api/reports/?scope=week&anchor=YYYY-MM-DD` | Week or month report |
| POST | `/api/donations/` | Mark due donation paid |

Input validation is in `backend/breaks/serializers.py`, write rules in `services.py`, and dashboard/report calculations in `selectors.py`. DRF `APIView` classes only adapt requests and responses. Frontend pages and components are under `frontend/src/pages` and `frontend/src/components`.

## Verify

```bash
cd backend && python manage.py test && python manage.py check
cd ../frontend && npm ci && npm run build
```

The app tracks actions only while a browser/session can make requests. It does not create operating-system popups or automatically start scheduled breaks while the browser is closed.
