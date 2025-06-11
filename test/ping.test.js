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
const DA_CONTENT_HOST = process.env.DA_CONTENT_HOST || 'https://content.da.live';
const DA_LIVE_HOST = process.env.DA_LIVE_HOST || 'https://da.live';
const DA_UE_HOST = process.env.DA_UE_HOST || 'https://main--uetest--da-testautomation.ue.da.live';

console.log(new Date().toUTCString());
console.log('Environment configuration:');
console.log('DA_ADMIN_HOST =', DA_ADMIN_HOST);
console.log('DA_COLLAB_HOST =', DA_COLLAB_HOST);
console.log('DA_CONTENT_HOST =', DA_CONTENT_HOST);
console.log('DA_LIVE_HOST =', DA_LIVE_HOST);
console.log('DA_UE_HOST =', DA_UE_HOST);

describe('Ping Suite', () => {
  // eslint-disable-next-line func-names
  before(function (done) {
    this.timeout(10000);
    console.log('Network warmup');

    // Do a fetch on da-admin to warm up the network
    const url = `${DA_ADMIN_HOST}/source/da-sites/da-status/tests/pingtest.html`;

    // before() can't handly async for us, so use the promise approach
    fetch(url).then((res) => res.text())
      .then(() => done())
      .catch((e) => {
        console.log('Caught exception during warmup', e);
        done();
      });
  });

  it('Ping da-admin', async () => {
    const url = `${DA_ADMIN_HOST}/source/da-sites/da-status/tests/pingtest.html`;
    const res = await fetch(url);
    const txt = await res.text();
    assert(txt.includes('<p>ping</p>'), `da-admin is down. Expected <p>ping</p> not found in ${url}: ${txt}`);
  }).timeout(5000);

  it('Ping da-collab', async () => {
    const res = await fetch(`${DA_COLLAB_HOST}/api/v1/ping`);
    const json = await res.json();
    assert.equal('ok', json.status, `da-collab is down, status: ${JSON.stringify(json)}`);
    assert.deepStrictEqual(
      ['da-admin'],
      json.service_bindings,
      `da-collab not using service binding to reach da-admin, status: ${JSON.stringify(json)}`,
    );
  }).timeout(5000);

  it('Ping da-content', async () => {
    const url = `${DA_CONTENT_HOST}/da-sites/da-status/tests/pingtest`;
    const res = await fetch(url);
    const txt = await res.text();
    assert(txt.includes('<p>ping</p>'), `da-content is down. Expected <p>ping</p> not found in ${url}: ${txt}`);
  }).timeout(5000);

  it('Ping da-live', async () => {
    const res = await fetch(DA_LIVE_HOST);
    const html = await res.text();

    const doc = cheerio.load(html);
    const title = doc('title');
    const txt = title.text();
    assert.equal('Browse - DA', txt, `Page title not found in: ${txt}`);
  }).timeout(5000);

  it('Ping da-ue', async () => {
    // da-ue content
    let url = `${DA_UE_HOST}/index`;
    let res = await fetch(url);
    let txt = await res.text();
    assert(res.status === 401, `da-ue is down. ${url} returned ${res.status}`);
    assert(txt.includes('<script src="https://universal-editor-service.adobe.io/cors.js" async></script>'), `da-ue is down. Expected "<h1>Congrats, you are ready to go! </h1>" not found in ${url}: ${txt}`);

    // da-ue reverse proxy
    url = `${DA_UE_HOST}/scripts/aem.js`;
    res = await fetch(url);
    txt = await res.text();
    assert(res.ok, `da-ue is down. Reverse proxy is not working for ${url}`);
    assert(txt.includes('function init()'), `da-ue is down. Reverse proxy is not working for ${url}`);
  }).timeout(5000);
});
