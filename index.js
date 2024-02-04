const Bundle = require('bare-bundle')
const bareResolve = require('bare-module-resolve')
const { builtinModules } = global.Bare ? { builtinModules: [] } : require('module')
const { pathToFileURL, fileURLToPath } = require('url-file-url')
const compile = require('./compile')

const builtinModulesSet = new Set(builtinModules)
const builtinRequire = require
const host = require.addon ? require.addon.host : global.process.platform + '-' + global.process.arch

module.exports = function runBundle (buffer, { mount = './main.bundle', entrypoint } = {}) {
  const bundle = Bundle.isBundle(buffer) ? buffer : Bundle.from(buffer)
  const mountURL = (typeof mount === 'object' || mount.startsWith('file://')) ? new URL(mount) : pathToFileURL(mount)
  const opts = { resolutions: bundle.resolutions, extensions: ['.js', '.cjs', '.json', '.mjs'], conditions: ['node'] }

  return run(bundle, ensureDir(mountURL), Object.create(null), opts, entrypoint || bundle.main || '/index.js')
}

function ensureDir (url) {
  return url.pathname.endsWith('/') ? url : new URL(url.href + '/')
}

function run (bundle, mount, cache, opts, filename) {
  if (cache[filename]) return cache[filename].exports

  const mod = cache[filename] = {
    filename,
    dirname: filename.slice(0, filename.lastIndexOf('/')),
    exports: {},
    require
  }

  require.cache = cache
  require.resolve = resolve
  require.addon = addon

  const src = bundle.read(filename)
  if (!src) throw new Error('Module not in bundle: "' + filename + '"')

  const parent = new URL(mod.filename, 'file://')
  compile(mod, src.toString())

  return mod.exports

  function addon (dirname = '.') {
    const u = new URL(dirname, parent)
    const key = decodeURI(u.pathname.replace(/\/$/, '') || '/')
    const r = opts.resolutions[key]
    if (!r || !r['bare:addon']) throw new Error('Only preresolved native addons supported atm')
    const addon = r['bare:addon'].replace(/{host}/, host)
    const f = addon.startsWith('file://') ? new URL(addon) : new URL((addon.startsWith('/') ? '.' : '') + addon, mount)
    return builtinRequire(fileURLToPath(f))
  }

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
    return run(bundle, mount, cache, opts, key)
  }

  function readPackage (url) {
    const s = bundle.read(url.pathname)
    if (!s) return null
    try {
      return JSON.parse(s.toString())
    } catch {
      return null
    }
  }
}
