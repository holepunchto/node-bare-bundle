const runBundle = require('../')
const test = require('brittle')
const Bundle = require('bare-bundle')

const path = require('path')
const BUNDLE = require('./fixtures/bundle.js')

test('can run bundle', async function (t) {
  t.plan(1)

  const stream = runBundle(BUNDLE, '/test.js')

  stream.on('data', function (data) {
    t.is(data, 'works!')
  })
})

test('can run any part of the bundle', function (t) {
  t.plan(1)

  const streamx = runBundle(BUNDLE, { entrypoint: '/node_modules/streamx/index.js' })

  t.ok(streamx.Readable)
})

test('can load native addons from bundle', function (t) {
  const b = new Bundle()
  const fs = require('fs')

  b.write('/index.js', 'module.exports = require("sodium-native")')
  add('/node_modules/sodium-native/package.json')
  add('/node_modules/sodium-native/index.js')
  add('/node_modules/node-gyp-build/index.js')
  add('/node_modules/node-gyp-build/node-gyp-build.js')
  add('/node_modules/node-gyp-build/package.json')

  b.resolutions = {
    '/node_modules/sodium-native/': {
      'bare:addon': '/../../node_modules/sodium-native/prebuilds/{host}/sodium-native.node'
    }
  }

  const sodium = runBundle(b.toBuffer(), { mount: path.join(__dirname, 'test.bundle') })

  t.ok(sodium.crypto_generichash)

  function add (key) {
    b.write(key, fs.readFileSync(path.join(__dirname, '..', key)))
  }
})
