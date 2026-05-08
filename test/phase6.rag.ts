import detectPatterns from '../skills/detectPatterns.skill.js';

const dom = `
LIMITED TIME OFFER!!!

Only 2 minutes left!

Subscribe now to continue.

Hidden recurring billing applies.

This offer expires soon.
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
      'test-user'
    );

  console.log(
    JSON.stringify(result, null, 2)
  );

})();