/**
 * Module dependencies
 */

var utils = require('./utils');
var generate = require('./generate');
var seed = process.env.SEED || require('secure-random')(10, {type: 'Buffer'}).toString('hex');
var write = require('fs').writeFileSync;
var should = require('should');
var flatten = utils.flatten;

var root = utils.root;

describe('generated cases (' + seed + ')', function() {
  console.log('SEED=' + seed);
  generate(seed).forEach(function(test, i) {
    it('test ' + i, function(next) {
      var fn = utils.compile(test);
      var out = fn(utils.DOM, utils.$get);
      if (out && !Array.isArray(out)) out = [out];
      var actual = flatten(utils.clone(out));
      try {
        should(actual).eql(test.output);
      } catch (e) {
        var path = root + '/seed-' + seed + '-test-' + i;
        write(path + '.js', fn.__orig);
        write(path + '.input.json', JSON.stringify(test.input, null, '  '));
        write(path + '.expected.json', JSON.stringify(test.output, null, '  '));
        write(path + '.actual.json', JSON.stringify(actual, null, '  '));
        return next(e); //next(new Error('test ' + i + ' failed! check ' + path))
      }
      next();
    });
  });
});
