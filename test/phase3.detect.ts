import detectPatterns from '../skills/detectPatterns.skill.js';

const res = await detectPatterns(
  "https://example.com fake dom with pricing, urgency, fake scarcity",
  {
    clauses: [],
    highRisk: [{ text: "Auto renewal clause..." }]
  },
  "user123"
);

console.log(res);
