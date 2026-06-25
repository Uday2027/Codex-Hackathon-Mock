const { classifyTicket } = require('./server');

const testCases = [
    {
        id: 1,
        message: "I sent 3000 to wrong number",
        expectedCaseType: "wrong_transfer",
        expectedSeverity: "high",
        expectedDepartment: "dispute_resolution"
    },
    {
        id: 2,
        message: "Payment failed but balance deducted",
        expectedCaseType: "payment_failed",
        expectedSeverity: "high",
        expectedDepartment: "payments_ops"
    },
    {
        id: 3,
        message: "Someone called asking my OTP, is that bKash?",
        expectedCaseType: "phishing_or_social_engineering",
        expectedSeverity: "critical",
        expectedDepartment: "fraud_risk"
    },
    {
        id: 4,
        message: "Please refund my last transaction, I changed my mind",
        expectedCaseType: "refund_request",
        expectedSeverity: "low",
        expectedDepartment: "customer_support"
    },
    {
        id: 5,
        message: "App crashed when I opened it",
        expectedCaseType: "other",
        expectedSeverity: "low",
        expectedDepartment: "customer_support"
    },
    // Adding some Bengali/Banglish variants to verify multilingual coverage
    {
        id: 6,
        message: "আমি ভুল নাম্বারে টাকা পাঠিয়েছি, দয়া করে ফেরত দিন",
        expectedCaseType: "wrong_transfer",
        expectedSeverity: "high",
        expectedDepartment: "dispute_resolution"
    },
    {
        id: 7,
        message: "Ami vul transfer koresi, taka back den please",
        expectedCaseType: "wrong_transfer",
        expectedSeverity: "high",
        expectedDepartment: "dispute_resolution"
    },
    {
        id: 8,
        message: "Payment success/failed text visual check: amar payment failed kintu balance kete nilo",
        expectedCaseType: "payment_failed",
        expectedSeverity: "high",
        expectedDepartment: "payments_ops"
    },
    {
        id: 9,
        message: "Ekjon call kore batiyeche ami lottery jitgeshi ar otp chay",
        expectedCaseType: "phishing_or_social_engineering",
        expectedSeverity: "critical",
        expectedDepartment: "fraud_risk"
    }
];

console.log("=== RUNNING TICKETS CLASSIFICATION TESTS ===");
let passed = 0;
testCases.forEach((tc) => {
    const res = classifyTicket(tc.message);
    const caseTypeOk = res.case_type === tc.expectedCaseType;
    const severityOk = res.severity === tc.expectedSeverity;
    const deptOk = res.department === tc.expectedDepartment;
    
    // Safety check: verify agent_summary does not ask for credentials
    const containsCredentialAsking = /otp|pin|password|passward|card/i.test(res.agent_summary) && 
                                     /ask|give|send|share|provide|input|enter/i.test(res.agent_summary);
    
    const summarySafetyOk = !containsCredentialAsking;

    const isOk = caseTypeOk && severityOk && deptOk && summarySafetyOk;
    
    console.log(`\nTest Case ${tc.id}: "${tc.message}"`);
    console.log(`  Case Type:  Matched? ${caseTypeOk ? '✔' : '✘'} (Got: "${res.case_type}", Expected: "${tc.expectedCaseType}")`);
    console.log(`  Severity:   Matched? ${severityOk ? '✔' : '✘'} (Got: "${res.severity}", Expected: "${tc.expectedSeverity}")`);
    console.log(`  Department: Matched? ${deptOk ? '✔' : '✘'} (Got: "${res.department}", Expected: "${tc.expectedDepartment}")`);
    console.log(`  Summary:    "${res.agent_summary}" (Safety: ${summarySafetyOk ? '✔ Safe' : '✘ UNSAFE'})`);
    console.log(`  Confidence: ${res.confidence}`);
    console.log(`  Human Review: ${res.human_review_required}`);
    
    if (isOk) {
        passed++;
    } else {
        console.error(`  FAIL`);
    }
});

console.log(`\nResults: Passed ${passed}/${testCases.length} tests.`);
if (passed === testCases.length) {
    console.log("ALL TESTS PASSED SUCCESSFULLY! 🎉");
    process.exit(0);
} else {
    console.error("SOME TESTS FAILED! ❌");
    process.exit(1);
}
