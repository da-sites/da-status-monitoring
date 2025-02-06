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

console.log(new Date().toUTCString());
console.log('Using DA_ADMIN_HOST =', DA_ADMIN_HOST);
console.log('SLACK_TOKEN provided =', process.env.SLACK_TOKEN ? 'yes' : 'no');

function setLastUpdated(doc) {
  const para = doc('p:contains("Last updated:")');
  para.text(`Last updated: ${new Date().toUTCString()}`);
}

function setServiceStatus(service, status, doc) {
  const svcEl = doc(`li:contains("${service}")`);
  if (svcEl.length < 1) {
    throw new Error(`Service ${service} not found in status page`);
  }

  let parent = svcEl;
  do {
    parent = parent.parent();
  } while (parent[0].name !== 'div');

  const statusP = parent.next().first('p');
  statusP.text(status);
}

function getDetailedStatus(service, junitRes) {
  const suite = junitRes(`testcase[classname="Test ${service}"]`);
  let passing = true;

  suite.each((_, elm) => {
    passing = passing && junitRes(elm).children().length === 0;
  });
  return passing;
}

function getPingStatus(service, junitRes) {
  const tc = junitRes(`testcase[name="Ping ${service}"]`);
  const status = tc.children().length === 0;
  return status;
}

async function postSlackMessage(msg) {
  if (!process.env.SLACK_TOKEN) {
    console.error('No SLACK_TOKEN provided, skipping Slack message');
    return;
  }

  const opts = {
    method: 'POST',
    headers: new Headers({ Authorization: `Bearer ${process.env.SLACK_TOKEN}` }),
  };

  const url = `https://slack.com/api/chat.postMessage?channel=da-status&text=${msg}`;
  const sr = await fetch(url, opts);
  if (sr.status === 200) {
    console.log('Sent message to Slack at', new Date());
  } else {
    console.log('Problem sending message to slack', sr);
  }
}

async function updateServiceStatus(service, junitRes, doc) {
  const pingStatus = getPingStatus(service, junitRes);
  const detailStatus = getDetailedStatus(service, junitRes);

  const status = pingStatus && detailStatus ? 'up' : 'down';
  setServiceStatus(service, status, doc);
  console.log(`Service ${service}: ${status}`);

  if (status !== 'up' && process.env.SLACK_TOKEN) {
    const msg = encodeURIComponent(`Alert: ${service} is ${status}`);
    await postSlackMessage(msg);
  }
}

async function updateStatuses(junitRes, doc) {
  await updateServiceStatus('da-admin', junitRes, doc);
  await updateServiceStatus('da-collab', junitRes, doc);
  await updateServiceStatus('da-content', junitRes, doc);
  await updateServiceStatus('da-live', junitRes, doc);
}

async function pushToAdmin(doc) {
  const content = doc.html();
  const blob = new Blob([content], { type: 'text/html' });
  const formData = new FormData();
  formData.append('data', blob);

  const opts = { method: 'PUT', body: formData };
  const putResp = await fetch(STATUS_ADMIN_URL, opts);
  if (putResp.status !== 201 && putResp.status !== 200) {
    throw new Error(`Problem updating status page: ${putResp.status}`);
  }
}

async function updateStatus(junitRes) {
  const resp = await fetch(STATUS_ADMIN_URL);
  if (resp.status !== 200) {
    throw new Error(`Unable to obtain status page: ${resp.status}`);
  }
  const text = await resp.text();

  const doc = cheerio.load(text);
  await updateStatuses(junitRes, doc);
  setLastUpdated(doc);

  await pushToAdmin(doc);
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

try {
  await updateStatus(junitRes);
  if (!process.env.SKIP_PUBLISH) {
    await previewAndPublish();
  }
} catch (e) {
  console.error('Error updating status:', e);
  await postSlackMessage(`Updating status info failed: ${e} - For more details: https://github.com/da-sites/da-status-monitoring/actions`);
  process.exit(1);
}
