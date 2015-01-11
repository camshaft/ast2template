function tree(i) {
  if (i === 0) return [null, null];
  var children = tree(i - 1);
  return [
    {
      type: 'tag',
      name: 'div',
      children: [children[0], children[0]],
      buffer: true
    },
    {
      tag: 'div',
      props: {},
      children: children[1] ? [children[1], children[1]] : null
    }
  ];
}

var children = tree(10);

exports.input = [
  {
    type: 'tag',
    name: 'div',
    children: [children[0]],
    buffer: true
  }
];

exports.output = {
  tag: 'div',
  props: {},
  children: [children[1]]
};

exports.iterations = 1000;
