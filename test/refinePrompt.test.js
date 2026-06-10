import test from 'node:test';
import assert from 'node:assert/strict';
import { refinePrompt } from '../src/shared/promptRefiner.js';
import { detectPlatform } from '../src/shared/platforms.js';

test('refinePrompt formalizes casual questions', () => {
  const result = refinePrompt('can you help me write a summary of css grid');
  assert.match(result, /Could you please|Please provide/);
  assert.match(result, /summary/i);
});

test('refinePrompt preserves imperative intent', () => {
  const result = refinePrompt('explain async await in javascript');
  assert.match(result, /^Provide a thorough explanation of/i);
});

test('refinePrompt translates common Vietnamese SaaS request to English', () => {
  const result = refinePrompt('tôi muốn xây dựng một phần mềm SaaS với backend là conductorOSS');
  assert.equal(result, 'I would like to develop a SaaS application with a backend built using conductorOSS.');
});

test('detectPlatform identifies supported hosts', () => {
  assert.equal(detectPlatform('chatgpt.com')?.id, 'chatgpt');
  assert.equal(detectPlatform('claude.ai')?.id, 'claude');
  assert.equal(detectPlatform('example.com'), null);
});
