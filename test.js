const fs = require('fs')
const test = require('brittle')
const Bundle = require('bare-bundle')
const { pathToFileURL } = require('url-file-url')
const run = require('.')

const path = require('path')
const BUNDLE = require('./test/fixtures/bundle.js')

test('can run bundle', async function (t) {
  t.plan(1)

  const stream = run(BUNDLE, '/test.js')

  stream.on('data', function (data) {
    t.is(data, 'works!')
  })
})

test('can run any part of the bundle', function (t) {
  t.plan(1)

  const streamx = run(BUNDLE, { entrypoint: '/node_modules/streamx/index.js' })

  t.ok(streamx.Readable)
})

test('can load assets', function (t) {
  const b = new Bundle()
  b.write('/index.js', 'module.exports = require.asset("./index.js")')
  b.resolutions = {
    '/index.js': {
      './index.js': {
        asset: pathToFileURL('/path/to/asset').href,
        default: '/index.js'
      }
    }
  }

  const asset = run(b.toBuffer(), { mount: path.join(__dirname, 'test.bundle') })
  t.is(asset, path.resolve('/path/to/asset'))
})

test('can load native addons from bundle', function (t) {
  const b = new Bundle()

  b.write('/index.js', 'module.exports = require("sodium-native")')
  add(b, '/node_modules/sodium-native/package.json')
  add(b, '/node_modules/sodium-native/index.js')
  add(b, '/node_modules/node-gyp-build/index.js')
  add(b, '/node_modules/node-gyp-build/node-gyp-build.js')
  add(b, '/node_modules/node-gyp-build/package.json')

  b.resolutions = {
    '/node_modules/sodium-native/': {
      'bare:addon': {
        linux: {
          arm64: {
            bare: '/../node_modules/sodium-native/prebuilds/linux-arm64/sodium-native.bare',
            node: '/../node_modules/sodium-native/prebuilds/linux-arm64/sodium-native.node'
          },
          x64: {
            bare: '/../node_modules/sodium-native/prebuilds/linux-x64/sodium-native.bare',
            node: '/../node_modules/sodium-native/prebuilds/linux-x64/sodium-native.node'
          }
        },
        darwin: {
          arm64: {
            bare: '/../node_modules/sodium-native/prebuilds/darwin-arm64/sodium-native.bare',
            node: '/../node_modules/sodium-native/prebuilds/darwin-arm64/sodium-native.node'
          },
          x64: {
            bare: '/../node_modules/sodium-native/prebuilds/darwin-x64/sodium-native.bare',
            node: '/../node_modules/sodium-native/prebuilds/darwin-x64/sodium-native.node'
          }
        },
        win32: {
          arm64: {
            bare: '/../node_modules/sodium-native/prebuilds/win32-arm64/sodium-native.bare',
            node: '/../node_modules/sodium-native/prebuilds/win32-arm64/sodium-native.node'
          },
          x64: {
            bare: '/../node_modules/sodium-native/prebuilds/win32-x64/sodium-native.bare',
            node: '/../node_modules/sodium-native/prebuilds/win32-x64/sodium-native.node'
          }
        }
      }
    }
  }

  const sodium = run(b.toBuffer(), { mount: path.join(__dirname, 'test.bundle') })

  t.ok(sodium.crypto_generichash)
})

test('can compile json file', function (t) {
  const b = new Bundle()

  b.write('/index.js', 'module.exports = require("./package.json")')
  add(b, '/package.json')

  const pkg = run(b.toBuffer(), { mount: path.join(__dirname, 'test.bundle') })

  t.is(pkg.name, 'node-bare-bundle')
})

function add (b, key) {
  b.write(key, fs.readFileSync(path.join(__dirname, key)))
}
