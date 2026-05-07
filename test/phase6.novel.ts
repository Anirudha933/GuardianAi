import detectPatterns from '../skills/detectPatterns.skill.js';

console.log("PHASE6 NOVEL TEST LOADED");

const dom = `
Astronomical telescope calibration portal.

Satellite orbit stabilization dashboard.

Deep space quantum radiation telemetry.

Interstellar propulsion efficiency metrics.
`;

const tosResult = {
  clauses: [],
  highRisk: [],
};

(async () => {

  const result =
    await detectPatterns(
      dom,
      tosResult,
      'novel-user'
    );

  console.log(
    JSON.stringify(result, null, 2)
  );

})();