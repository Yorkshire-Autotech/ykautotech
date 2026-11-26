# Yorkshire Autotech booking system

## Architecture

The public website remains a static Cloudflare Pages site. Booking operations run
in Cloudflare Pages Functions under `functions/api/`; Google and Firebase secrets
never reach the browser.

- Firebase/Firestore remains the source of truth for booking records.
- Google Calendar is the source of truth for occupied appointment time.
- Cloudflare Pages Functions verify Firebase admin ID tokens before admin actions.
- Confirmed booking locks are stored in 15-minute `availability` documents.
- The Google Calendar event uses `bookingSlotDuration`, not `estimatedJobDuration`.
- Pending-approval requests do not create locks or Google Calendar events.

## Cloudflare Pages environment variables

Set these as encrypted production variables for the Pages project:

| Variable | Purpose |
| --- | --- |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_SERVICE_ACCOUNT` | Complete service-account JSON stored as one encrypted value |
| `ADMIN_EMAILS` | Comma-separated Firebase emails allowed to use the admin API |
| `SITE_ORIGIN` | `https://yorkshireautotech.co.uk` |
| `BUSINESS_TIME_ZONE` | `Europe/London` |
| `GOOGLE_CLIENT_ID` | Web OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Web OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Exact OAuth callback URI below |
| `GOOGLE_CALENDAR_ID` | ID of **Yorkshire Autotech – Workshop Bookings** |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name for booking photographs |
| `CLOUDINARY_UPLOAD_PRESET` | Restricted unsigned upload preset |

Copy `.dev.vars.example` to `.dev.vars` for local `wrangler pages dev` use. Do not
commit `.dev.vars` or the service-account JSON.

## Google Cloud Console

1. Open the existing Google Cloud project and enable **Google Calendar API**.
2. Configure the OAuth consent screen. Use an external user type unless the
   organisation is a Google Workspace tenant. While publishing status is
   **Testing**, add every Google account used to connect the calendar as a test
   user. Refresh-token access expires for test-only apps after seven days.
3. Create an OAuth client of type **Web application**.
4. Add this exact authorised redirect URI:

   `https://yorkshireautotech.co.uk/api/calendar/callback`

5. Create a dedicated calendar named **Yorkshire Autotech – Workshop Bookings**.
6. In Calendar settings, copy its Calendar ID and set `GOOGLE_CALENDAR_ID`.
7. Share the calendar with the second owner with **Make changes to events**
   permission. One OAuth connection owns the shared calendar integration, while
   both owners can use it in Google Calendar.

The requested scope is
`https://www.googleapis.com/auth/calendar`, because the integration must read
busy periods and create, update, and delete events. The implementation never
uses a browser API key as a substitute for OAuth.

For a public production app, Google may require branding/domain verification
and OAuth verification when moving out of Testing. Keep the app in Testing
until every Google account has been added as a test user, or complete Google's
production verification before making it available more widely. A restricted
Calendar scope may still require review.

## Firebase configuration

1. In Firebase Console, create a service account key for the existing project.
   Prefer a dedicated least-privilege account with access to Cloud Datastore and
   the project.
2. Store the complete downloaded JSON in `FIREBASE_SERVICE_ACCOUNT` in
   Cloudflare. Do not paste it into `firebase-config.js`.
3. Publish the repository's `firestore.rules`.
4. Add the owners as Firebase Email/Password users.
5. Put both owner emails in `ADMIN_EMAILS`. The current direct Firestore admin
   read rule permits `yorkshireautotech@outlook.com` and users with an `admin`
   custom claim. Set the claim for the second owner, or add their email to the
   `isAdmin` list before publishing.

No existing `bookings` documents are migrated or deleted. Older records without
the new fields continue to render and keep their original status. Newly written
fields are additive:

- `serviceId`, `service`, `bookingType`
- `bookingSlotDuration`, `estimatedJobDuration`
- `bookingStatus`
- `vehicleMake`, `vehicleModel`, `vehicleYear`, `registration`
- `engineVariant`, `fittingLocation`, `address`
- `partDetails`, `productLink`, `uploadedImages`
- `googleCalendarEventId`, `calendarSyncStatus`
- `calendarLastSyncedAt`, `calendarLastError`
- `requestId`, `createdByAdmin`

## Image upload configuration

Create a Cloudinary unsigned upload preset restricted to image files, a maximum
8 MB size, and the `yorkshire-autotech/booking-parts` folder. Set its cloud name
and preset values in Cloudflare. If it is not configured, bookings still work,
but photo upload returns an explicit configuration error rather than silently
discarding an image.

## Connecting the calendar

1. Sign in to `https://yorkshireautotech.co.uk/admin.html`.
2. Select **Connect Google Calendar**.
3. Sign in with the Google account that owns or can manage the dedicated
   calendar and grant Calendar access.
4. The callback securely exchanges the code and stores the refresh token in the
   server-only `settings/googleCalendar` Firestore document.
5. Confirm that the admin status says **Connected**.

The browser never receives the refresh token. Access tokens are refreshed on
the server when required. Reconnect using the same button if consent is revoked
or a token expires.

## Admin configuration

The admin page includes **Services, durations, opening hours & holidays**.
It is stored in server-only `settings/bookingConfig`. Service entries control:

- display name
- booking-slot minutes
- estimated-work minutes
- Fitting Only availability
- Supply & Fit availability
- approval requirement

Working hours, holidays, lead times, maximum advance time, mobile fitting, and
slot increment are in the same configuration. Fitting Only uses
`bookingLeadHours` (24 hours by default); Supply & Fit uses
`supplyAndFitLeadHours` (168 hours/seven days by default). Ambient lighting defaults to a
60-minute calendar slot and 240-minute estimated work duration.

## Deployment and testing

Deploy through the existing Cloudflare Pages project only after variables are
set and a preview test has passed. No production deployment is performed by
the code change.

Recommended preview sequence:

1. Connect OAuth from the admin page and inspect the callback status.
2. Verify the connected account can read the dedicated shared calendar.
3. Add a manual calendar event and confirm its time disappears from the site.
4. Submit a Fitting Only booking and verify one ambient-lighting hour is
   reserved in Calendar while four hours are shown as estimated work.
5. Submit Supply & Fit and verify it remains pending without an event.
6. Approve, reschedule, complete, cancel, and retry sync from the admin page.
7. Submit simultaneous requests for the same interval and verify only one is
   accepted.
8. Open the admin WhatsApp action and verify the prefilled message and existing
   business number.
9. Check an old Firebase booking without new fields.
10. Revoke the refresh token and verify the dashboard shows an actionable error.

Local checks completed without external credentials:

- SEO validation passed.
- All Pages Function modules parsed successfully in a browser.
- The six-step customer flow rendered on desktop-sized browser output.
- Ambient lighting produced a 60-minute Calendar event and retained a
  240-minute estimated work duration.
- Four 15-minute reservation locks were generated for a one-hour slot.
- Overlapping 15-minute lock ranges were detected.
- No editor diagnostics or diff whitespace errors were found.

Live OAuth, Calendar, Firestore transaction, Cloudinary, and email tests remain
intentionally pending because the private production environment values have not
been supplied.

## Current manual prerequisites

The integration cannot be connected until the owner supplies the Google OAuth
client values, dedicated calendar ID, Firebase service-account JSON, owner
emails, and Cloudinary upload configuration. Placeholder values are deliberately
not included.
