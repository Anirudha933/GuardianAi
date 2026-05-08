import analyseTos from '../skills/analyseTos.skill.js';

const sample = `
By subscribing to our service, you agree to automatic renewal every month unless cancelled at least 48 hours before billing.
We may share your personal data with third-party partners for marketing purposes.
All disputes shall be resolved through binding arbitration.
`;

const res = await analyseTos(sample);
console.log("Response:",res);
