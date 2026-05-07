import generateResponse from '../skills/generateResponse.skill';

const res = await generateResponse(
  "https://example.com",
  {
    summary: ["urgency_manipulation", "forced_continuity"],
    overall_risk: "HIGH"
  },
  {
    highRisk: [{ text: "Auto renewal clause..." }]
  }
);

console.log(res);