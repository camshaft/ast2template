exports.input = [
  {
    type: 'tag',
    name: 'div',
    props: [
      ['foo', {expression: '"bar"'}],
      ['baz', {expression: '"bang"'}]
    ],
    buffer: true
  }
];

exports.output = {
  tag: 'div',
  props: [
    ['foo', 'bar'],
    ['baz', 'bang']
  ],
  children: null
};

exports.iterations = 1000000;
