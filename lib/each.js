module.exports = __ast2template_each;

function __ast2template_each(collection, fn) {
  var out = [];
  if (!collection) return out;

  if (collection.length) {
    for (var i = 0, l = collection.length; i < l; i++) {
      out.push(fn(collection[i], i));
    }
  } else {
    for (var k in collection) {
      out.push(fn(collection[k], k));
    }
  }

  return out;
}
