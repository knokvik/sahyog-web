<p align="center">
  <img src="assets/sahyog-logo.png" alt="Sahyog" width="96" />
</p>

<p align="center"><strong>Sahyog Web</strong></p>

This is the website coordinators, volunteers, and NGOs open in a browser. It is the shared picture: alerts, a map, relief zones, and the organization portal.

For local use, the desk is pointed at `https://sahyog-new.onrender.com`. Sign-in is Clerk. Maps are OpenStreetMap, the same tiles on the home page and on the live map, so the home map does not ask for a separate API key.

Run it with `npm install` and `npm run dev`. It opens at `http://127.0.0.1:5174/`.

**Pages anyone signed in can open**

These sit under the main desk. The role check allows an admin, a coordinator, a volunteer, a citizen, and an organization account. Some actions inside a page are still limited to an admin.

- `/` — home. Live broadcasts, the situation map, and the counts for the current disaster
- `/orchestrator` — the live triage desk: risk, the English and Hindi note, and how the alert was scored
- `/zones` and `/zones/:id` — relief zones, and one zone in detail
- `/escalations` — work that needs a higher look
- `/coordinators` — how coordinators are performing
- `/reports` — written reports
- `/sos` and `/needs` — the SOS and needs list
- `/disasters` — disasters you can open, activate, and close
- `/shelters` and `/resources` — shelters and supply points
- `/volunteers` — people who can respond
- `/missing` — the missing-person board
- `/users` — accounts and roles
- `/relief` — draw a help zone and watch the kit request go to NGOs
- `/map` — the deployment map. `/live-map` sends you here
- `/command` — the command view of the same ground
- `/server` — is the API answering
- `/audit-logs` — the activity trail
- `/dashboard` — an old address. It sends you to `/zones`

**Pages that do not need the full desk**

- `/sign-in` and `/sign-up` — Clerk
- `/public-heatmap` — a public heatmap. Do not put this on a projector if the data includes names or phone numbers
- `/org-onboarding` — register an organization

**Organization portal**

Only an organization account can open `/org`. The pages use the same outer spacing, and the titles are not bold.

- `/org` — their dashboard counts
- `/org/requests` — relief asks. Accept, reject, and name a coordinator
- `/org/volunteers` — people linked to the NGO
- `/org/resources` — stock they can offer
- `/org/tasks` — tasks their volunteers are carrying
- `/org/zones` — zones where they already have people or supplies
- `/org/activity-log` — what the organization did
- `/org/profile` — their own record

**What the desk calls**

The browser does not invent data. Typical calls, all on the Sahyog API:

- `POST /api/auth/sync` and `GET /api/users/me` when you sign in
- `GET /api/v1/sos`, `/needs`, `/disasters`, `/zones`, `/missing`, `/shelters`, and `/resources` for the lists and the map
- `GET /api/v1/orchestrator/summary` for the triage page, plus the live socket events `new_sos_alert` and `orchestrator:update`
- `POST /api/v1/disasters/:id/relief-zones` when an admin draws a zone
- `GET /api/v1/organizations/me/...` for every organization page: stats, requests, volunteers, resources, tasks, zones, and the activity log

Anything the page cannot load is a server or sign-in problem, not a second map key. The home map uses the same OpenStreetMap tiles as the live map.
