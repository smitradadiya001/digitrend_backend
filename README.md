# DiGITrend Contact Backend

Simple Node/Express backend to handle the DiGITrend contact form and send two emails:

1. A **thank you** email to the user who filled in the form.
2. A **notification** email to the website owner.

## Setup

1. Open a terminal in the `server` folder:

   ```bash
   cd server
   npm install
   ```

2. Create your `.env` file:

   ```bash
   cp .env.example .env
   ```

   Then edit `.env` and fill in:

   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` from your email provider
   - `OWNER_EMAIL` to the address that should receive new inquiries
   - Optionally set `CLIENT_ORIGIN` to your React app URL for stricter CORS

3. Start the backend:

   ```bash
   npm run dev
   ```

   The server will start on `http://localhost:5000` by default.

## API

### `POST /api/contact`

**Body (JSON):**

```json
{
  "name": "User name (optional)",
  "email": "user@example.com",
  "message": "Their message"
}
```

**Responses:**

- `200 OK`:

  ```json
  { "success": true, "message": "Messages sent successfully." }
  ```

- `4xx / 5xx`:

  ```json
  { "success": false, "error": "Error message..." }
  ```

Make sure your frontend `Contact` form sends a `POST` request with `Content-Type: application/json` to this endpoint.

