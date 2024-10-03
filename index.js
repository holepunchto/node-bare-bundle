const Bundle = require('bare-bundle')
const resolveModule = require('bare-module-resolve')
const resolveAddon = require('bare-addon-resolve')
const path = require('path')
const b4a = require('b4a')
const { isWindows, isBare, isElectron, platform, arch } = require('which-runtime')
const { pathToFileURL, fileURLToPath } = require('url-file-url')

const builtinRequire = require
const builtinModules = new Set(isBare ? [] : require('module').builtinModules)

if (isElectron) builtinModules.add('electron')

const conditions = ['node', platform, arch]

if (isBare) conditions.push('bare')

module.exports = function run (buffer, { mount = '.', entrypoint } = {}) {
  let bundle = Bundle.from(buffer)

  if (entrypoint) bundle.main = entrypoint
  else if (bundle.main === null) bundle.main = '/index.js'

  bundle = bundle.mount(ensureDir(pathToFileURL(mount)))

  return load(bundle, Object.create(null), bundle.main)
}

function ensureDir (url) {
  return url.pathname.endsWith('/') ? url : new URL(url.href + '/')
}

function load (bundle, cache, href) {
  if (cache[href]) return cache[href].exports

  const url = new URL(href)

  const filename = urlToPath(url)
  const dirname = urlToDirname(url)

  const mod = cache[href] = {
    filename,
    dirname,
    exports: {},
    require
  }

  require.main = builtinRequire.main
  require.cache = cache
  require.resolve = resolve
  require.addon = addon
  require.asset = asset

  const src = bundle.read(href)

  if (src === null) throw new Error(`Cannot find module '${url.href}'`)

  const str = b4a.toString(src)

  if (path.extname(href) === '.json') mod.exports = JSON.parse(str)
  else evaluate(mod, str)

  return mod.exports

  function require (req) {
    if (builtinModules.has(req)) return builtinRequire(req)

    return load(bundle, cache, resolve(req))
  }

  function resolve (req) {
    if (builtinModules.has(req)) return req

    for (const resolved of resolveModule(req, url, { resolutions: bundle.resolutions, conditions }, readPackage)) {
      if (bundle.exists(resolved.href)) return resolved.href
    }

    throw new Error(`Cannot find module '${req}' imported from '${url.href}'`)
  }

  function addon (req = '.') {
    for (const resolved of resolveAddon(req, url, { resolutions: bundle.resolutions, conditions }, readPackage)) {
      if (resolved.protocol === 'file:') return builtinRequire(fileURLToPath(resolved))
    }

    throw new Error(`Cannot find addon '${req}' imported from '${url.href}'`)
  }

  function asset (req) {
    for (const resolved of resolveModule(req, url, { resolutions: bundle.resolutions, conditions: ['asset'] }, readPackage)) {
      if (resolved.protocol === 'file:') return fileURLToPath(resolved)
    }

    throw new Error(`Cannot find asset '${req}' imported from '${url.href}'`)
  }

  function readPackage (url) {
    const src = bundle.read(url.href)

    if (src === null) return null

    try {
      return JSON.parse(b4a.toString(src))
    } catch {
      return null
    }
  }
}

function evaluate (module, source) {
  (new Function('__filename', '__dirname', 'module', 'exports', 'require', source))( // eslint-disable-line no-new-func
    module.filename,
    module.dirname,
    module,
    module.exports,
    module.require
  )
}

function urlToPath (url) {
  if (url.protocol === 'file:') return fileURLToPath(url)

  if (isWindows) {
    if (/%2f|%5c/i.test(url.pathname)) {
      throw new Error('The URL path must not include encoded \\ or / characters')
    }
  } else {
    if (/%2f/i.test(url.pathname)) {
      throw new Error('The URL path must not include encoded / characters')
    }
  }

  return decodeURIComponent(url.pathname)
}

function urlToDirname (url) {
  if (url.protocol === 'file:') return path.dirname(fileURLToPath(url))

  if (isWindows) {
    if (/%2f|%5c/i.test(url.pathname)) {
      throw new Error('The URL path must not include encoded \\ or / characters')
    }
  } else {
    if (/%2f/i.test(url.pathname)) {
      throw new Error('The URL path must not include encoded / characters')
    }
  }

  return decodeURIComponent((new URL('.', url)).pathname).replace(/\/$/, '')
}
