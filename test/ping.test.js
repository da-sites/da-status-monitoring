/*
 * Copyright 2024 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
/* eslint-env mocha */
/* eslint-disable no-console */
import assert from 'assert';
import * as cheerio from 'cheerio';

const DA_ADMIN_HOST = process.env.DA_ADMIN_HOST || 'https://admin.da.live';
const DA_COLLAB_HOST = process.env.DA_COLLAB_HOST || 'https://collab.da.live';
const DA_LIVE_HOST = process.env.DA_LIVE_HOST || 'https://da.live';

console.log(new Date().toUTCString());
console.log('Environment configuration:');
console.log('DA_ADMIN_HOST =', DA_ADMIN_HOST);
console.log('DA_COLLAB_HOST =', DA_COLLAB_HOST);
console.log('DA_LIVE_HOST =', DA_LIVE_HOST);

describe('Ping Suite', () => {
  it('Ping da-admin', async () => {
    const url = `${DA_ADMIN_HOST}/source/da-sites/da-status/tests/pingtest.html`;
    const res = await fetch(url);
    const txt = await res.text();
    assert(txt.includes('<p>ping</p>'), `da-admin is down. Expected <p>ping</p> not found in ${url}: ${txt}`);
  });

  it('Ping da-collab', async () => {
    const res = await fetch(`${DA_COLLAB_HOST}/api/v1/ping`);
    const json = await res.json();
    assert.equal('ok', json.status, `da-collab is down, status: ${JSON.stringify(json)}`);
    assert.deepStrictEqual(
      ['da-admin'],
      json.service_bindings,
      `da-collab not using service binding to reach da-admin, status: ${JSON.stringify(json)}`,
    );
  });

  it('Ping da-live', async () => {
    const res = await fetch(DA_LIVE_HOST);
    const html = await res.text();

    const doc = cheerio.load(html);
    const title = doc('title');
    const txt = title.text();
    assert.equal('Browse - Dark Alley', txt, `Page title not found in: ${txt}`);
  });
});
