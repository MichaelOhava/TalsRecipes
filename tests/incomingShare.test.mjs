import assert from 'node:assert/strict';
import test from 'node:test';
import { createIncomingShareDraft, parseIncomingShare } from '../src/utils/incomingShare.ts';

test('parses Instagram URLs passed through the share target query', () => {
  const result = parseIncomingShare(
    'https://michaelohava.github.io/TalsRecipes/?url=https%3A%2F%2Fwww.instagram.com%2Freel%2FABC123%2F'
  );
  assert.equal(result?.url, 'https://www.instagram.com/reel/ABC123/');
});

test('parses doubly encoded TikTok URLs passed by Shortcuts', () => {
  const result = parseIncomingShare(
    'https://michaelohava.github.io/TalsRecipes/?url=https%253A%252F%252Fwww.tiktok.com%252F%2540cook%252Fvideo%252F123'
  );
  assert.equal(result?.url, 'https://www.tiktok.com/@cook/video/123');
});

test('extracts social URLs embedded in shared text and persists a recipe draft', () => {
  const payload = parseIncomingShare(
    'https://michaelohava.github.io/TalsRecipes/?text=Try%20this%20https%3A%2F%2Fvm.tiktok.com%2FZ123abc'
  );
  assert.equal(payload?.url, 'https://vm.tiktok.com/Z123abc');

  assert.ok(payload);
  const draft = createIncomingShareDraft(payload, 'en', 1_700_000_000_000);
  assert.equal(draft?.platform, 'tiktok');
  assert.equal(draft?.sourceUrl, payload?.url);
  assert.equal(draft?.title, 'TikTok shared video');
  assert.ok(draft?.prepMinutes >= 1);
  assert.ok(draft?.cookMinutes >= 1);
  assert.equal(draft?.savedAt, new Date(1_700_000_000_000).toISOString());
});

test('does not create recipe drafts for unsupported shared URLs', () => {
  const payload = parseIncomingShare(
    'https://michaelohava.github.io/TalsRecipes/?url=https%3A%2F%2Fexample.com%2Fvideo'
  );
  assert.ok(payload);
  assert.equal(createIncomingShareDraft(payload, 'en'), null);
});
