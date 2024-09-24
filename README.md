# node-bare-bundle

Run a Bare bundle in a Node.js environment.

```
npm install node-bare-bundle
```

## Usage

``` js
const runBundle = require('node-bare-bundle')
// only need to pass mount if using preresolved native modules
const exports = runBundle(bundleAsABuffer, { mount: './test.bundle' entrypoint: '/the/entrypoint.js' })
```

## License

Apache-2.0
