module.exports = __ast2template_each;

function __ast2template_each(collection, fn) {
  var out = [];
  if (!collection) return out;

  var i = 0;

  // generator support
  var iterator = collection.next;
  iterator = typeof iterator === 'function' ?
    iterator :
    (typeof collection['@@iterator'] === 'function' ? collection['@@iterator']() : null);

  if (iterator) {
    for (var item; !(item = iterator()).done; i++) {
      out.push(fn(item.value, i));
    }
  } else if (collection.length) {
    for (var l = collection.length; i < l; i++) {
      out.push(fn(collection[i], i));
    }
  } else {
    for (var k in collection) {
      out.push(fn(collection[k], k));
    }
  }

  return out;
}
