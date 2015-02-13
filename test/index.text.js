/**
 * Module dependencies
 */

var should = require('should');
var dir = require('fs').readdirSync;
var write = require('fs').writeFileSync;
var uglify = require('uglify-js');
var benchmark = require('directiv-test-benchmark');
var bytes = require('bytes');
var colors = require('colors');
var gzip = require('zlib').gzip;
var utils = require('./utils');

/**
 * Initialization
 */

var root = __dirname;

var cases = dir(root + '/cases').reduce(function(acc, name) {
  var ast = require(root + '/cases/' + name);
  if (!ast.input) return acc;
  acc.push({
    title: name.replace(/-/g, ' '),
    name: name,
    input: utils.flatten(ast.input),
    output: utils.flatten(JSON.parse(JSON.stringify(ast.output))),
    iterations: ast.iterations || 10000,
    args: [
      ast.DOM || utils.DOM,
      ast.$get || utils.$get
    ]
  });
  return acc;
}, []);

function stat(name, length, prev) {
  var padding = new Array(22 - name.length);
  var size = bytes(length);
  var pre = padding.join(' ') + name + ': ';
  console.log(pre.gray + (!prev || length < prev ? size.green : size.yellow));
}

describe('ast2template', function() {

  describe('cases', function() {
    cases.forEach(function(test) {
      describe('should ' + test.title, function() {
        it('should compile', function() {
          var fn = utils.compile(test).render;

          try {
            utils.clone(fn.apply(null, test.args)).should.eql(test.output);
          } catch (e) {
            var out = utils.root + '/' + test.name + '.txt';
            write(out, e.message);
            throw new Error('failed! view ' + out + ' for more info');
          }
        });

        it('should minify', function(done) {
          try {
            var str = utils.compile(test, true);
          } catch (e) { return ; }

          var output = utils.root + '/' + test.name;

          write(output + '.js', str);
          stat('unminified', str.length);

          var min = uglify.minify('(function() {' + str + '})()', {fromString: true}).code;
          write(output + '.min.js', min);
          stat('minified', min.length, str.length);

          gzip(min, function(err, gzipped) {
            stat('gzip', gzipped.length, min.length);
            done();
          });
        });
      });
    });
  });

  benchmark.enabled(function() {
    describe('benchmarks', function() {
      cases.forEach(function(test) {
        var render = utils.compile(test).render.bind(null, noop, noop);
        try {
          describe('should ' + test.title, function() {
            benchmark(test.iterations, 1, render);
          });
        } catch (e) {
          console.log(render.toString());
        }
      });
    });
  });
});

function noop() {}
