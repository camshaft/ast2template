module.exports = function __ast2template_merge(a) {
  var args = arguments;
  for (var i = 1; i < args.length; i++) {
    var arg = args[i];
    if (!arg) continue;
    for (var k in arg) {
      if (!arg.hasOwnProperty(k)) continue;
      if (k === 'class') {
        if (a[k]) a[k] += ' ' + arg[k];
        else a[k] = arg[k];
      } else if (k === 'style') {
        a[k] = __ast2template_merge(a[k] || {}, arg[k]);
      } else {
        a[k] = arg[k];
      }
    }
  }
  return a;
};
