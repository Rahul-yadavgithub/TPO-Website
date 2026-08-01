# External Platform Integration Guide

Welcome to the Integration Guide! This document outlines the exact technical requirements, API contracts, and security protocols required to synchronize company data between our systems. 

To ensure zero downtime and maximum reliability for our 1,000+ companies, we are utilizing an **Event-Driven Bulk-Sync Architecture**.

---

## 1. Architectural Overview

Instead of our frontend polling your API directly (which can cause latency and rate-limiting issues), we maintain a **Local Snapshot Database** of your data. 
To keep our local snapshot perfectly synchronized with your database, we require two things from your team:

1. **A Bulk Export API**: To allow us to pull the initial state of all companies (nightly or on-demand).
2. **A Real-Time Webhook**: To notify us instantly whenever a company is updated, created, or deleted on your end.

---

## 2. Phase 1: Bulk Export API (Your Deliverable)

Please build a REST endpoint that returns the current state of all active companies in your database. Our backend will call this securely to perform the initial bulk sync.

**Endpoint details:**
* **URL:** `GET https://<your-domain>/api/v1/companies/export`
* **Authentication:** Must be protected by a static API key passed in the headers (`x-api-key: <Secret_Key>`). Please provide us with this key once generated(something you can use the randome number ).
* **Pagination (Optional but Recommended):** If the payload is too large, please support standard `?page=1&limit=100` query parameters.

**Expected JSON Response Format:**
*Note: You do not need to follow a strict structure. Provide whatever data you have (e.g. package, stipend, drive type, onCampus), and our system will map it dynamically! Just ensure `externalCompanyId` and `name` are present.*

```json
{
  "success": true,
  "data": [
    {
      "externalCompanyId": "uuid-1234-5678",
      "name": "Rippling",
      "slug": "rippling-inc",
      "driveStatus": "Upcoming on 15th Sept 2026",
      "package": "25 LPA",
      "stipend": "1 Lakh/month",
      "driveType": "On-Campus",
      "eligibleBranches": ["CSE", "MNC", "ECE"]
    },
    {
      "externalCompanyId": "uuid-9876-5432",
      "name": "Google",
      "slug": "google",
      "driveStatus": "Not Scheduled",
      "salary": "32 LPA",
      "eligibleBranches": ["CSE"]
    }
  ]
}
```

---

## 3. Phase 2: Real-Time Webhook (Your Deliverable)

To keep our data fresh without constant polling, your system must trigger a webhook to our backend whenever a company's data changes.

### A. Webhook Destination (Our Endpoint)
* **URL:** `POST https://job-finder-adf5.onrender.com/api/webhooks/external-platform/company-updated`
* **Content-Type:** `application/json`

### B. Payload Structure
When a company changes, `POST` the full updated company object so we do not have to make a round-trip `GET` request.

```json
{
  "event": "company.updated",
  "data": {
    "externalCompanyId": "uuid-1234-5678",
    "name": "Rippling",
    "slug": "rippling-inc",
    "driveStatus": "Completed",
    "package": "28 LPA",
    "stipend": "1 Lakh/month",
    "onCampus": true,
    "eligibleBranches": ["CSE", "MNC", "ECE", "EE"]
  }
}
```
*(Note: Use `"event": "company.created"` for new companies).*

### C. Webhook Security (HMAC-SHA256)
We **do not** accept unverified webhooks. To prevent malicious data injection, you must sign every webhook payload.

1. **The Secret Key:** We have already generated a highly secure Secret Key for you: `TpoSync!2026#SecretCodeXyZ987`
2. **Hash the Payload:** On your backend, generate an HMAC-SHA256 hash of the raw JSON request body using the Secret Key provided above.
3. **Include the Header:** Attach the resulting hex digest in the HTTP headers as `X-Signature`.

**Example NodeJS implementation on your end:**
```javascript
const crypto = require('crypto');

const payload = JSON.stringify(webhookData);
const secret = 'TpoSync!2026#SecretCodeXyZ987';
const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

// Send the request
axios.post('https://job-finder-adf5.onrender.com/api/webhooks/external-platform/company-updated', payload, {
  headers: {
    'Content-Type': 'application/json',
    'X-Signature': signature
  }
});
```

### D. Retry Policy (Exponential Backoff)
If our backend is undergoing maintenance and returns a `5xx` status code, please do not drop the webhook. 
Implement an exponential backoff retry policy (e.g., retry after 1 min → 5 mins → 15 mins → Dead Letter Queue).

---

## 4. Summary of What We Need From You

To finalize the integration, please securely hand over the following two items to our team:
1. **The Base URL** for your Bulk Export API.
2. **The `x-api-key`** to authenticate our `GET` requests to your export API.


