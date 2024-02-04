const runBundle = require('../')
const test = require('brittle')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

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

  const streamx = runBundle(BUNDLE, '/node_modules/streamx/index.js')

  t.ok(streamx.Readable)
})
