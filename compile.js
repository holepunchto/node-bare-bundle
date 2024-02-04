/* eslint-disable no-new-func */
module.exports = function (module, __source) {
  (new Function('__filename', '__dirname', 'module', 'exports', 'require', __source))(module.filename, module.dirname, module, module.exports, module.require)
}
