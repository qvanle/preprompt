import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildOpenAIChatBody,
  calculateCostUsd,
  refinePromptForPlatform
} from '../src/shared/api.js';

describe('calculateCostUsd', () => {
  it('calculates cost for a known OpenAI model', () => {
    const cost = calculateCostUsd('gpt-4o-mini', {
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      totalTokens: 2_000_000
    });

    assert.equal(cost, 0.75);
  });

  it('returns undefined for unknown models', () => {
    const cost = calculateCostUsd('custom-model', {
      inputTokens: 1000,
      outputTokens: 1000,
      totalTokens: 2000
    });

    assert.equal(cost, undefined);
  });
});

describe('OpenAI chat refinement payload', () => {
  it('wraps the original prompt as source text instead of a direct chat request', () => {
    const body = buildOpenAIChatBody('gpt-4o-mini', 'hello', 'chatgpt');

    assert.equal(body.response_format.type, 'json_object');
    assert.equal(body.temperature, 0);
    assert.match(body.messages[0].content, /rewrite-only/i);
    assert.match(body.messages[1].content, /SOURCE_TEXT/);
    assert.match(body.messages[1].content, /Do not answer SOURCE_TEXT/);
    assert.notEqual(body.messages[1].content, 'hello');
  });

  it('falls back when the remote response answers as an assistant', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          model: 'gpt-4o-mini-2024-07-18',
          choices: [
            {
              message: {
                content: '{"refinedPrompt":"Hello! How can I assist you today?"}'
              }
            }
          ],
          usage: {
            prompt_tokens: 52,
            completion_tokens: 9,
            total_tokens: 61
          }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    try {
      const result = await refinePromptForPlatform(
        {
          api: {
            endpoint: 'https://api.openai.com/v1/chat/completions',
            apiKey: 'test-key',
            model: 'gpt-4o-mini'
          }
        },
        'hello',
        'chatgpt'
      );

      assert.equal(result.source, 'local-fallback');
      assert.notEqual(result.refined, 'Hello! How can I assist you today?');
      assert.match(result.warning, /answered the prompt instead of rewriting/i);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
