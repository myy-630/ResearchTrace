import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = new URL('..', import.meta.url).pathname;

test('bundle manifest exports both plugin halves and patch resources', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.name, '@local/researchtrace');
  assert.equal(pkg.dsh.bundle.patch, './cordis.patch.yml');
  assert.equal(pkg.dsh.client.platform, 'web');
  assert.equal(pkg.dsh.client.immediately, true);
  for (const entry of ['.', './client', './icon', './locale/*.json']) {
    assert.ok(pkg.exports[entry], `missing export ${entry}`);
  }
  for (const file of ['index.js', 'src/client/index.js', 'cordis.patch.yml', 'icon.svg', 'locale/en.json', 'locale/zh.json']) {
    assert.ok(existsSync(join(root, file)), `missing bundle file ${file}`);
  }
  const patch = readFileSync(join(root, 'cordis.patch.yml'), 'utf8');
  assert.match(patch, /id: researchtrace/);
  assert.match(patch, /name: '@local\/researchtrace'/);
});
