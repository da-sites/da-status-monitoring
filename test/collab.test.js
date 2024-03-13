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
  it('Test YDoc WebSocket connection', (done) => {
    const ydoc = new Y.Doc();
    const room = `${DA_ADMIN_HOST}/source/da-sites/da-status/tests/wstest.html`;
    const wsProvider = new yws.WebsocketProvider(
      DA_COLLAB_HOST,
      room,
      ydoc,
      { WebSocketPolyfill: WebSocket },
    );

    ydoc.on('update', () => {
      try {
        const initial = ydoc.getMap('aem').get('initial');

        // Gracefully disconnect to avoid errors on the server
        wsProvider.disconnect();
        ydoc.destroy();

        // Now check the returned content
        const testContent = 'WSTest123';
        assert(
          initial.includes(testContent),
          `Web socket connection to da-collab not working: did not provide the correct content: looking for ${testContent} in ${initial}`,
        );
        done();
      } catch (error) {
        done(error);
      }
    });
  });
});
