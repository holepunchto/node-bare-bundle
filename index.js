const Bundle = require('bare-bundle')
const bareResolve = require('bare-module-resolve')
const { builtinModules } = require('module')
const compile = require('./compile')

const builtinModulesSet = new Set(builtinModules)
const builtinRequire = require

module.exports = function runBundle (buffer, entrypoint = '/index.js') {
  const bundle = Bundle.from(buffer)
  const opts = { resolutions: bundle.resolutions, extensions: ['.js', '.cjs', '.json', '.mjs'], conditions: ['node'] }
  console.log('bundle -->')
  console.log(bundle)
  return run(bundle, Object.create(null), opts, entrypoint)
}

function run (bundle, cache, opts, filename) {
  if (cache[filename]) return cache[filename].exports

  const mod = cache[filename] = {
    filename,
    dirname: filename.slice(0, filename.lastIndexOf('/')),
    exports: {},
    require
  }

  require.cache = cache
  resolve.resolve = resolve

  const src = bundle.read(filename)
  if (!src) throw new Error('Module not bundle: "' + filename + '"')

  const parent = new URL(mod.filename, 'file://')
  console.log('parent pkg', parent.href)
  compile(mod, src.toString())

  return mod.exports

  function resolve (req) {
    if (builtinModulesSet.has(req)) return req
    for (const u of bareResolve(req, parent, opts, readPackage)) {
      if (bundle.exists(u.pathname)) return u.pathname
    }
    throw new Error('Could not resolve "' + req + '" from "' + mod.dirname + '"')
  }

  function require (req) {
    if (builtinModulesSet.has(req)) return builtinRequire(req)
    const key = resolve(req)
    return run(bundle, cache, opts, key)
  }

  function readPackage (url) {
    console.log('read pkg', url.href)
    const s = bundle.read(url.pathname)
    if (!s) return null
    try {
      return JSON.parse(s.toString())
    } catch {
      return null
    }
  }
}
