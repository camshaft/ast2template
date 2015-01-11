/**
 * Module dependencies
 */

var ast2template = require('../');
var store = new (require('hyper-store'))({});
var _eval = require('eval');
var should = require('should');
var flatten = require('flatten');

exports.root = process.cwd() + '/.tests';

exports.flatten = function(arr) {
  if (!Array.isArray(arr)) return arr;
  arr = flatten(arr).filter(function(item) {
    return item !== null && typeof item !== 'undefined';
  });
  if (arr.length === 0 || (arr.length === 1 && arr[0] == null)) return null;
  return arr;
};

exports.DOM = function DOM(tag, props, children) {
  // TODO flatten children
  if (children && !Array.isArray(children)) children = [children];
  children = exports.flatten(children);
  // we don't care about testing the key
  if (props) delete props.key;
  return {
    tag: tag,
    props: props || {},
    children: children || null
  };
};

exports.$get = function $get(path, scope, defaultVal) {
  var res = store.get(path, scope);
  if (!res.completed) return res.value || defaultVal;
  return typeof res.value === 'undefined' ? defaultVal : res.value;
};

exports.compile = function compile(test, toString) {
  var str = ast2template(test.input, test.opts);
  if (toString) return str;
  try {
    var fn = _eval(str, test.name, {}, true);
    fn.__orig = str;
    return fn;
  } catch (e) {
    console.error(str);
  }
};

exports.clone = function clone(obj) {
  if (typeof obj === 'undefined') return null;
  return JSON.parse(JSON.stringify(obj));
};
