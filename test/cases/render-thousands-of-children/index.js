var children = [];
var expected = [];

for (var i = 0; i < 2000; i++) {
  children.push({
    type: 'tag',
    name: 'span',
    buffer: true
  });
  expected.push({
    tag: 'span',
    props: {},
    children: null
  });
};

exports.input = [
  {
    type: 'tag',
    name: 'div',
    children: children,
    buffer: true
  }
];

exports.output = {
  tag: 'div',
  props: {},
  children: expected
};

exports.iterations = 1000;
