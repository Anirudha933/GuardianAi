import { routeLLM } from './lib/llmRouter.js';





const result = await routeLLM(
    'classification',
    'Detect manipulative dark patterns.'
);