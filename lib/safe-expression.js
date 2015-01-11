module.exports = __ast2template_safe_expression;

function __ast2template_safe_expression(val, expr) {
  if (!val || typeof val !== 'object' || Array.isArray(val)) return val;

  if (process.env.NODE_ENV !== 'production') {
    if (!__ast2template_safe_expression[expr[0] + expr[1]]) {
      __ast2template_safe_expression[expr[0] + expr[1]] = true;
      var err = new Error('Attempting to set object as DOM value with expression: ' + JSON.stringify(expr[0]) + ' on line ' + expr[1]);
      console.error(err.stack || err);
    }
    return typeof val.toString !== 'undefined' ? val.toString() : '⚠ ' + JSON.stringify(expr[0]) + ' -> [object Object] ⚠';
  }
}
