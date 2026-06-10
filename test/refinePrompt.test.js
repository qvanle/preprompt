import test from 'node:test';
import assert from 'node:assert/strict';
import refinePrompt from '../src/shared/promptRefiner.js';
import { detectPlatform } from '../src/shared/platforms.js';

test('refinePrompt formalizes casual questions', () => {
  const result = refinePrompt('can you help me write a summary of css grid');
  assert.match(result, /Could you please|Please provide/);
  assert.match(result, /summary/i);
});

test('refinePrompt preserves imperative intent', () => {
  const result = refinePrompt('explain async await in javascript');
  assert.match(result, /Please explain|Explain/i);
  assert.match(result, /async await/i);
});

test('refinePrompt expands a SaaS idea into a real prompt', () => {
  const result = refinePrompt('i want to build a SaaS');
  assert.notEqual(result, 'i want to build a SaaS');
  assert.match(result, /SaaS application/i);
  assert.match(result, /product scope/i);
  assert.match(result, /backend architecture/i);
});

test('refinePrompt expands a help request instead of echoing it', () => {
  const result = refinePrompt('can you help me build a SaaS');
  assert.notEqual(result, 'can you help me build a SaaS');
  assert.match(result, /plan and build a SaaS application/i);
  assert.match(result, /implementation steps/i);
});

test('refinePrompt handles a greeting as a prompt rewrite', () => {
  const result = refinePrompt('hello');
  assert.notEqual(result, 'hello');
  assert.match(result, /warm, friendly greeting/i);
  assert.match(result, /offer assistance/i);
});

test('refinePrompt translates common Vietnamese SaaS request to English', () => {
  const result = refinePrompt('tôi muốn xây dựng một phần mềm SaaS với backend là conductorOSS');
  assert.equal(
    result,
    'I want to build a SaaS application with a backend built using conductorOSS. Please help me define the product scope, core features, backend architecture, and launch plan.'
  );
});

test('detectPlatform identifies supported hosts', () => {
  assert.equal(detectPlatform('chatgpt.com')?.id, 'chatgpt');
  assert.equal(detectPlatform('claude.ai')?.id, 'claude');
  assert.equal(detectPlatform('example.com'), null);
});
