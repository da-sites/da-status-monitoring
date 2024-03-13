# da-status

Runs status checks on da-live and associated services.

Status checks are implemented as mocha tests.

## Development

To run the service against locally executing servers, configure the following environment variables:

* `DA_COLLAB_HOST` the da-collab host. Defaults to `https://collab.da.live`
* `DA_ADMIN_HOST` the da-admin host. Defaults to `https://admin.da.live`
* `DA_LIVE_HOST` the da-live host. Defaults to `https://da.live`

For example, execute the tests like this:
```
DA_COLLAB_HOST=http://localhost:4711 DA_ADMIN_HOST=http://localhost:8787 DA_LIVE_HOST=http://localhost:3000 npm t
```
