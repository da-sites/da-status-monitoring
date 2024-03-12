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
import jsdom from 'jsdom';

const DA_ADMIN_HOST = process.env.DA_ADMIN_HOST || 'https://admin.da.live';
const STATUS_ADMIN_URL = `${DA_ADMIN_HOST}/source/documentauthoring/da-aem-monitoring/status/latest.html`;
const STATUS_PAGE = 'https://main--da-aem-monitoring--documentauthoring.hlx.page/status/latest';

console.log('Using DA_ADMIN_HOST =', DA_ADMIN_HOST);

function setLastUpdated(dom) {
  const ps = dom.window.document.querySelectorAll('p');
  for (const para of ps) {
    if (para.textContent && para.textContent.startsWith('Last updated:')) {
      para.textContent = `Last updated: ${new Date()}`;
    }
  }
}

async function pushToAdmin(dom) {
  const content = dom.serialize();
  const blob = new Blob([content], { type: 'text/html' });
  const formData = new FormData();
  formData.append('data', blob);

  const opts = { method: 'PUT', body: formData };
  const putResp = await fetch(STATUS_ADMIN_URL, opts);
  if (putResp.status !== 201) {
    throw new Error(`Problem updating status page: ${putResp.status}`);
  }
}

async function updateStatus() {
  try {
    const resp = await fetch(STATUS_ADMIN_URL);
    if (resp.status !== 200) {
      throw new Error(`Unable to obtain status page: ${resp.status}`);
    }
    const text = await resp.text();
    console.log('Obtained status page');

    const dom = new jsdom.JSDOM(text);
    setLastUpdated(dom);
    // const table = dom.window.document.querySelector('div.columns');

    console.log(dom.serialize());
    await pushToAdmin(dom);
  } catch (error) {
    console.log('Problem updating status page', error);
  }
}

await updateStatus();
