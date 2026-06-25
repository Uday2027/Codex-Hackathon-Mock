# QueueStorm Warmup: Mock Preliminary Task

This repository contains a robust, lightweight, and fast web service designed to classify and route customer support tickets for a digital finance company (e.g., bKash).

The service is built with **Node.js** and **Express**, utilizing a high-precision, bilingual (English and Bengali/Banglish) rules-based text classification engine. It operates with zero external API dependencies, ensuring a response time well below the 30-second requirement (typically <5ms) and 100% deterministic behaviour.

---

## Features

1. **Bilingual Text Classification**: Accurately classifies support requests in English, Bangla, and Banglish (Bangla transliterated into English script).
2. **Case Types & Severity Routing**:
   - `wrong_transfer` -> `dispute_resolution` (Severity: `high`)
   - `payment_failed` -> `payments_ops` (Severity: `high`)
   - `phishing_or_social_engineering` -> `fraud_risk` (Severity: `critical`, flags for human review)
   - `refund_request` -> `customer_support` (Severity: `low`) or `dispute_resolution` (Severity: `medium`/`high` if contested)
   - `other` -> `customer_support` (Severity: `low`)
3. **Safety Compliance**: Generates neutral, one-sentence agent summaries and strictly complies with the Safety Rule by never requesting or mentioning sensitive data like PINs, passwords, or OTPs.
4. **Fast and Offline-capable**: No GPU dependencies or remote LLM calls, guaranteeing instantaneous processing.

---

## API Endpoints

### 1. Health Check
* **Method**: `GET`
* **Path**: `/health`
* **Response**:
  ```json
  {
    "status": "ok",
    "uptime": 12.34
  }
  ```

### 2. Ticket Classification
* **Method**: `POST`
* **Path**: `/sort-ticket`
* **Request Shape**:
  ```json
  {
    "ticket_id": "T-001",
    "channel": "app",
    "locale": "en",
    "message": "I sent 5000 taka to a wrong number this morning, please help me get it back"
  }
  ```
* **Response Shape**:
  ```json
  {
    "ticket_id": "T-001",
    "case_type": "wrong_transfer",
    "severity": "high",
    "department": "dispute_resolution",
    "agent_summary": "Customer reports sending 5000 BDT to a wrong number and requests recovery.",
    "human_review_required": false,
    "confidence": 0.88
  }
  ```

---

## Setup & Running Locally

### Prerequisites
* **Node.js** (v18 or higher recommended)
* **npm** (v9 or higher recommended)

### Installation

1. Clone or copy this repository to your local machine.
2. Initialize and install dependencies:
   ```bash
   npm install
   ```

### Running the Server

Start the local API server:
```bash
npm start
```
The server will run on port `3000` by default. You can change this by setting the `PORT` environment variable:
```bash
PORT=8080 npm start
```

### Running Tests

We have included a comprehensive test suite covering the public sample cases and multilingual examples:
```bash
node test.js
```

---

## Deployment Replication

This service can be deployed seamlessly to platforms like Vercel, Render, Railway, Fly.io, or AWS EC2:

### Deploying to Render / Railway / Fly.io
1. Create a new Web Service pointing to this repository.
2. Set the **Build Command** to: `npm install`
3. Set the **Start Command** to: `node server.js` (or `npm start`)
4. Expose the default port `3000` or configure the `PORT` environment variable.

---

## Testing with curl

You can verify the running service using curl:

```bash
# Health Check
curl http://localhost:3000/health

# Wrong Transfer Ticket
curl -X POST http://localhost:3000/sort-ticket \
  -H "Content-Type: application/json" \
  -d '{"ticket_id": "T-001", "message": "I sent 3000 to wrong number"}'
```
