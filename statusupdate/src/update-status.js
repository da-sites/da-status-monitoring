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
/* eslint-disable no-console */
import * as cheerio from 'cheerio';
import * as fs from 'fs';

const DA_ADMIN_HOST = process.env.DA_ADMIN_HOST || 'https://admin.da.live';
const HLX_ADMIN_HOST = process.env.HLX_ADMIN_HOST || 'https://admin.hlx.page';
const HLX_ADMIN_PATH = '/da-sites/da-status/main/status/latest';

const STATUS_ADMIN_URL = `${DA_ADMIN_HOST}/source/da-sites/da-status/status/latest.html`;
const PREVIEW_URL = `${HLX_ADMIN_HOST}/preview${HLX_ADMIN_PATH}`;
const PUBLISH_URL = `${HLX_ADMIN_HOST}/live${HLX_ADMIN_PATH}`;

console.log('Using DA_ADMIN_HOST =', DA_ADMIN_HOST);

function setLastUpdated(doc) {
  const para = doc('p:contains("Last updated:")');
  para.text(`Last updated: ${new Date()}`);
}

function setServiceStatus(service, status, doc) {
  const dalive = doc(`p:contains("${service}")`);

  let parent = dalive;
  do {
    parent = parent.parent();
  } while (parent[0].name !== 'div');

  const statusP = parent.next().first('p');
  statusP.text(status);
}

function updateServiceStatus(service, junitRes, doc) {
  const tc = junitRes(`testcase[name="Ping ${service}"]`);
  const status = tc.children().length === 0 ? 'up' : 'down';
  setServiceStatus(service, status, doc);
  console.log(`Service ${service}: ${status}`);
}

function updateStatuses(junitRes, doc) {
  updateServiceStatus('da-admin', junitRes, doc);
  updateServiceStatus('da-collab', junitRes, doc);
  updateServiceStatus('da-live', junitRes, doc);
}

async function pushToAdmin(doc) {
  const content = doc.html();
  const blob = new Blob([content], { type: 'text/html' });
  const formData = new FormData();
  formData.append('data', blob);

  const opts = { method: 'PUT', body: formData };
  const putResp = await fetch(STATUS_ADMIN_URL, opts);
  if (putResp.status !== 201) {
    throw new Error(`Problem updating status page: ${putResp.status}`);
  }
}

async function updateStatus(junitRes) {
  try {
    const resp = await fetch(STATUS_ADMIN_URL);
    if (resp.status !== 200) {
      throw new Error(`Unable to obtain status page: ${resp.status}`);
    }
    const text = await resp.text();

    const doc = cheerio.load(text);
    updateStatuses(junitRes, doc);
    setLastUpdated(doc);

    await pushToAdmin(doc);
  } catch (error) {
    console.log('Problem updating status page', error);
  }
}

async function previewAndPublish() {
  const opts = { method: 'POST' };
  const preresp = await fetch(PREVIEW_URL, opts);
  if (preresp.status !== 200) {
    throw new Error(`Problem previewing status update: ${preresp.status}`);
  }
  const pubresp = await fetch(PUBLISH_URL, opts);
  if (pubresp.status !== 200) {
    throw new Error(`Problem publishing status update: ${pubresp.status}`);
  }
  const json = await pubresp.json();
  console.log('Published at ', json.live.url);
}

if (process.argv.length !== 3) {
  console.error('Expected at least one argument!');
  process.exit(1);
}

const data = fs.readFileSync(process.argv[2], 'utf8');
const junitRes = cheerio.load(data, { xmlMode: true });

await updateStatus(junitRes);
await previewAndPublish();
