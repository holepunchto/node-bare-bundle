const runBundle = require('../')
const test = require('brittle')
const fs = require('fs')
const path = require('path')

test('can run bundle', function (t) {
  t.plan(1)

  const bundle = fs.readFileSync(path.join(__dirname, 'streamx.bundle'))

  const stream = runBundle(bundle, '/test.js')

  stream.on('data', function (data) {
    t.is(data, 'works!')
  })
})

test('can run any part of the bundle', function (t) {
  t.plan(1)

  const bundle = fs.readFileSync(path.join(__dirname, 'streamx.bundle'))

  const streamx = runBundle(bundle, '/node_modules/streamx/index.js')

  t.ok(streamx.Readable)
})
