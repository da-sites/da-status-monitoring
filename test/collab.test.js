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

// Workaround for https://github.com/yjs/y-websocket/issues/170
// y-websocket is not correctly defined as a ES Module
// therefore fallback to use require for importing it
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const WebSocket = require('ws');
const Y = require('yjs');
const yws = require('y-websocket');

const DA_ADMIN_HOST = process.env.DA_ADMIN_HOST || 'https://admin.da.live';
const DA_COLLAB_HOST = process.env.DA_COLLAB_HOST || 'https://collab.da.live';

describe('Test da-collab', () => {
  function getURLText(url) {
    return fetch(url).then((res) => res.text())
      .catch((e) => {
        console.log('Caught exception during warmup', e);
      });
  }

  // eslint-disable-next-line func-names
  before(function (done) {
    this.timeout(10000);
    console.log('Network warmup');

    // before() can't handly async for us, so use the promise approach
    getURLText(`${DA_ADMIN_HOST}/source/da-sites/da-status/tests/pingtest.html`)
      .then(getURLText(`${DA_COLLAB_HOST}/api/v1/ping`))
      .then(() => done());
  });

  it('Test YDoc WebSocket connection', (done) => {
    const ydoc = new Y.Doc();
    const room = `${DA_ADMIN_HOST}/source/da-sites/da-status/tests/wstest.html`;

    let wsProvider;
    // Register callback before the creation of the WebsocketProvider to avoid
    // race condition
    ydoc.on('update', () => {
      try {
        const initial = ydoc.getXmlFragment('prosemirror').toString();

        // Gracefully disconnect to avoid errors on the server
        wsProvider.disconnect();
        ydoc.destroy();

        // Now check the returned content
        const testContent = 'WSTest123';
        assert(
          initial.includes(testContent),
          `Web socket connection to da-collab not working: did not provide the correct content: looking in ${room} for ${testContent} in ${initial}`,
        );
        done();
      } catch (error) {
        done(error);
      }
    });

    wsProvider = new yws.WebsocketProvider(
      DA_COLLAB_HOST,
      room,
      ydoc,
      { WebSocketPolyfill: WebSocket },
    );
  }).timeout(10000);
});
