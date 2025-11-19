# da-status

Runs status checks on da-live and associated services.

Status checks are implemented as mocha tests.

Tests are automatically run on a cron schedule through a github action: https://github.com/da-sites/da-status-monitoring/actions
Note that the github actions will stop running 60 days after the last commit so even if no actual change is required, some commit activity is required to keep the action running.

The live status (as produced via the github action) can be seen here: https://main--da-status--da-sites.aem.live/status/latest

## Development

To run the service against locally executing servers, configure the following environment variables:

* `DA_COLLAB_HOST` the da-collab host. Defaults to `https://collab.da.live`
* `DA_CONTENT_HOST` the da-content host. Defaults to 'https://content.da.live'
* `DA_ADMIN_HOST` the da-admin host. Defaults to `https://admin.da.live`
* `DA_LIVE_HOST` the da-live host. Defaults to `https://da.live`

For example, execute the tests like this:
```
DA_COLLAB_HOST=http://localhost:4711 DA_ADMIN_HOST=http://localhost:8787 DA_LIVE_HOST=http://localhost:3000 npm t
```

