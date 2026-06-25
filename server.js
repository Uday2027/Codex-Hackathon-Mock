const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Helper function to extract amount from message
function extractAmount(message) {
    // Look for numbers followed by tk, taka, bdt or prefixed with tk, bdt, or just numbers of 3-6 digits
    const regexes = [
        /\b(\d+)\s*(?:taka|tk|bdt|টাকা)\b/i,
        /(?:tk|bdt|taka|টাকা)\s*(\d+)\b/i,
        /\b(\d{3,6})\b/
    ];
    for (const regex of regexes) {
        const match = message.match(regex);
        if (match) {
            return match[1];
        }
    }
    return null;
}

// Main ticket classification function
function classifyTicket(message) {
    const msg = message.toLowerCase();

    let case_type = 'other';
    let severity = 'low';
    let confidence = 0.50;

    // 1. Phishing / Social Engineering Check
    // Suspicious calls, SMS, or someone asking for PIN, OTP, or password
    const phishingKeywords = [
        'otp', 'pin', 'password', 'passward', 'verification code', 'code',
        'scam', 'scammer', 'fraud', 'fake call', 'asked for', 'asking for',
        'lottery', 'prize', 'cashback offer', 'suspicious call', 'bkash agent',
        'ভুয়া এজেন্ট', 'ওটিপি', 'পিন', 'পাসওয়ার্ড', 'পিন নম্বর', 'ওটিপি নম্বর',
        'প্রতারক', 'লটারি', 'পুরস্কার', 'পিন চাইছে', 'ওটিপি চাইছে',
        'otp chaise', 'pin chaise', 'pass chaise', 'fraud call', 'bkash key',
        'share otp', 'otp share', 'pin share', 'scam call', 'fraud call'
    ];
    
    let phishingScore = 0;
    for (const kw of phishingKeywords) {
        if (msg.includes(kw)) {
            phishingScore += 1;
        }
    }

    const hasSensitiveAsk = /otp|pin|password|passward|card/i.test(msg);
    const hasRequestAction = /ask|give|send|share|call|provide|want|told|demand|sms|request|phone|number|chaise|chaile|bolse|chay|cheyeche|ditose|dite|pathate/i.test(msg);
    
    if (phishingScore >= 1 || (hasSensitiveAsk && hasRequestAction)) {
        case_type = 'phishing_or_social_engineering';
        severity = 'critical'; // Always critical for phishing
        confidence = Math.min(0.85 + phishingScore * 0.03, 0.99);
    }

    // 2. Wrong Transfer Check
    // Money sent to the wrong recipient
    if (case_type === 'other') {
        const wrongTransferKeywords = [
            'wrong transfer', 'wrong number', 'sent to wrong', 'sent to another number',
            'incorrect number', 'transferred to wrong', 'wrong person', 'wrong recipient',
            'mistakenly sent', 'mistake transfer', 'sent 3000 to wrong', 'sent 5000 to wrong',
            'ভুল নাম্বারে', 'ভুল নম্বরে', 'ভুল জায়গায় টাকা', 'ভুল নাম্বারে টাকা',
            'ভুল নাম্বারে পাঠিয়েছি', 'ভুল করে পাঠিয়েছি', 'ভুল নাম্বারে সেন্ড', 'ভুল সেন্ড',
            'vul number', 'bhul number', 'vul transfer', 'vul taka send',
            'vul e pathay', 'mistake e send', 'vul kore send', 'vul number e', 'bhul no',
            'vul no', 'vul pathiyechi', 'mistake send'
        ];
        
        let wtScore = 0;
        for (const kw of wrongTransferKeywords) {
            if (msg.includes(kw)) {
                wtScore += 1;
            }
        }
        
        if (wtScore >= 1 || (msg.includes('sent') && msg.includes('wrong')) || (msg.includes('send') && msg.includes('wrong')) || (msg.includes('টাকা') && msg.includes('ভুল'))) {
            case_type = 'wrong_transfer';
            severity = 'high'; // Default high severity for wrong transfers as per Sample 1
            confidence = Math.min(0.80 + wtScore * 0.04, 0.98);
        }
    }

    // 3. Payment Failed Check
    // Transaction failed but balance may be deducted
    if (case_type === 'other') {
        const paymentFailedKeywords = [
            'payment failed', 'transaction failed', 'failed payment', 'balance deducted',
            'money deducted', 'taka deducted', 'money cut', 'amount deducted',
            'failed but money cut', 'payment declined', 'failed but balance cut',
            'failed transaction', 'payment not complete', 'unsuccessful payment',
            'পেমেন্ট ফেইল', 'পেমেন্ট ফেইল্ড', 'টাকা কেটেছে', 'টাকা কেটে নিয়েছে',
            'ব্যালেন্স কেটেছে', 'টাকা কেটেছে কিন্তু', 'লেনদেন ব্যর্থ', 'ট্রানজেকশন ব্যর্থ',
            'payment failed', 'payment fail', 'failed but balance deducted',
            'failed but money cut', 'taka kete niche', 'taka kete nilo',
            'balance kete niche', 'taka minus', 'fail kintu taka kete', 'payment hoyni kintu'
        ];
        
        let pfScore = 0;
        for (const kw of paymentFailedKeywords) {
            if (msg.includes(kw)) {
                pfScore += 1;
            }
        }
        
        if (pfScore >= 1 || (msg.includes('failed') && (msg.includes('deducted') || msg.includes('cut') || msg.includes('kete')))) {
            case_type = 'payment_failed';
            severity = 'high'; // Default high severity for failed payments with potential deduction as per Sample 2
            confidence = Math.min(0.80 + pfScore * 0.04, 0.98);
        }
    }

    // 4. Refund Request Check
    // Customer is asking for a refund
    if (case_type === 'other') {
        const refundKeywords = [
            'refund', 'refund my last transaction', 'want a refund', 'return my money',
            'money back', 'refund request', 'cancel my purchase and refund', 'get refund',
            'chargeback', 'cancel transaction refund',
            'রিফান্ড', 'রিফান্ড চাই', 'টাকা ফেরত', 'টাকা ব্যাক', 'টাকা ফেরত চাই',
            'টাকা ফেরত দিন', 'টাকা ফেরত পাবো',
            'refund', 'refund chai', 'refund den', 'taka ferot', 'money back',
            'taka back', 'refund request', 'cancel refund', 'taka return'
        ];
        
        let refScore = 0;
        for (const kw of refundKeywords) {
            if (msg.includes(kw)) {
                refScore += 1;
            }
        }
        
        if (refScore >= 1) {
            case_type = 'refund_request';
            
            // Check if it's contested or urgent to elevate severity
            if (msg.includes('urgent') || msg.includes('immediately') || msg.includes('delay') || msg.includes('days') || msg.includes('no refund')) {
                severity = 'medium';
            } else {
                severity = 'low'; // Default low severity for simple refund requests as per Sample 4
            }
            confidence = Math.min(0.85 + refScore * 0.03, 0.98);
        }
    }

    // 5. Other Check
    if (case_type === 'other') {
        const otherKeywords = [
            'crash', 'crashed', 'app not working', 'cannot login', 'login issue',
            'cannot sign in', 'account blocked', 'limit exceeded', 'how to cash out',
            'অ্যাপ ক্র্যাশ', 'লগইন হচ্ছে না', 'একউন্ট ব্লক', 'লগইন সমস্যা',
            'app crash', 'login hocche na', 'account block', 'login problem',
            'slow', 'not loading', 'error'
        ];
        
        let otherScore = 0;
        for (const kw of otherKeywords) {
            if (msg.includes(kw)) {
                otherScore += 1;
            }
        }
        
        severity = 'low'; // Default low severity for general other queries as per Sample 5
        if (otherScore >= 1) {
            confidence = 0.85;
        } else {
            confidence = 0.50;
        }
    }

    // --- Department Mapping ---
    // customer_support: other, low severity refund_request
    // dispute_resolution: wrong_transfer, contested refund_request (medium/high/critical severity)
    // payments_ops: payment_failed
    // fraud_risk: phishing_or_social_engineering
    let department = 'customer_support';
    if (case_type === 'wrong_transfer') {
        department = 'dispute_resolution';
    } else if (case_type === 'payment_failed') {
        department = 'payments_ops';
    } else if (case_type === 'phishing_or_social_engineering') {
        department = 'fraud_risk';
    } else if (case_type === 'refund_request') {
        if (severity === 'low') {
            department = 'customer_support';
        } else {
            department = 'dispute_resolution';
        }
    } else {
        department = 'customer_support';
    }

    // --- Human Review Flag ---
    // Set to true for critical severity or phishing cases
    const human_review_required = (severity === 'critical' || case_type === 'phishing_or_social_engineering');

    // --- Agent Summary ---
    // Safety Rule: Must never ask customer to share PIN, OTP, password, or card number.
    let agent_summary = '';
    if (case_type === 'wrong_transfer') {
        const amount = extractAmount(message);
        if (amount) {
            agent_summary = `Customer reports sending ${amount} BDT to a wrong number and requests recovery.`;
        } else {
            agent_summary = 'Customer reports sending money to an incorrect recipient and requests reversal.';
        }
    } else if (case_type === 'payment_failed') {
        const amount = extractAmount(message);
        if (amount) {
            agent_summary = `Customer reports a failed transaction of ${amount} BDT where their balance was deducted.`;
        } else {
            agent_summary = 'Customer reports a failed transaction where their balance was deducted and requests resolution.';
        }
    } else if (case_type === 'phishing_or_social_engineering') {
        agent_summary = 'Customer reports receiving a suspicious inquiry or call requesting sensitive information like OTP or PIN.';
    } else if (case_type === 'refund_request') {
        agent_summary = 'Customer requests a refund for a transaction.';
    } else {
        if (msg.includes('crash') || msg.includes('crashed') || msg.includes('ক্র্যাশ')) {
            agent_summary = 'Customer reports that the application crashed.';
        } else if (msg.includes('login') || msg.includes('log in') || msg.includes('signin') || msg.includes('লগইন')) {
            agent_summary = 'Customer reports trouble logging into the application.';
        } else if (msg.includes('block') || msg.includes('blocked') || msg.includes('ব্লক')) {
            agent_summary = 'Customer reports that their account is blocked.';
        } else {
            agent_summary = 'Customer reports a general issue or inquiry about the service.';
        }
    }

    return {
        case_type,
        severity,
        department,
        agent_summary,
        human_review_required,
        confidence: parseFloat(confidence.toFixed(2))
    };
}

// GET /health
app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

// POST /sort-ticket
app.post('/sort-ticket', (req, res) => {
    const { ticket_id, channel, locale, message } = req.body;

    if (!ticket_id || !message) {
        return res.status(400).json({ error: 'ticket_id and message are required fields.' });
    }

    try {
        const classification = classifyTicket(message);
        const response = {
            ticket_id,
            case_type: classification.case_type,
            severity: classification.severity,
            department: classification.department,
            agent_summary: classification.agent_summary,
            human_review_required: classification.human_review_required,
            confidence: classification.confidence
        };
        res.json(response);
    } catch (err) {
        res.status(500).json({ error: 'An error occurred during ticket sorting: ' + err.message });
    }
});

// Export the server for testing and run if executed directly
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`QueueStorm Warmup Service running on port ${PORT}`);
    });
}

app.classifyTicket = classifyTicket;
module.exports = app;
