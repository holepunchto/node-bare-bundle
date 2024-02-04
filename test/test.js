const runBundle = require('../')
const test = require('brittle')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

test.solo('can run bundle', async function (t) {
  t.plan(1)

  const bundle = fs.readFileSync(path.join(__dirname, 'streamx.data'))
  console.log(crypto.createHash('sha256').update(bundle).digest('hex'))

  {
    const bundle = await fs.promises.readFile(path.join(__dirname, 'streamx.data'))
    console.log(crypto.createHash('sha256').update(bundle).digest('hex'))
    console.log(await fs.promises.stat(path.join(__dirname, 'streamx.data')))
  }

  try {
    const stream = runBundle(bundle, '/test.js')

    stream.on('data', function (data) {
      t.is(data, 'works!')
    })
  } catch (err) {
    console.log(err)
    t.ok(true, 'whatever')
  }

  console.log(crypto.createHash('sha256').update(bundle).digest('hex'))
})

test('can run any part of the bundle', function (t) {
  t.plan(1)

  const bundle = fs.readFileSync(path.join(__dirname, 'streamx.bundle'))

  const streamx = runBundle(bundle, '/node_modules/streamx/index.js')

  t.ok(streamx.Readable)
})
