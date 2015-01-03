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

exports.str = __ast2template_each.toString();

exports.name = '__ast2template_each';
