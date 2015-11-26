exports.input = [
  {
    type: 'tag',
    name: 'div',
    buffer: true,
    props: {
      'class': {
        expressions: [
          '{foo: true, bar: false, baz: true}'
        ]
      }
    },
  }
];

exports.output = {
  tag: 'div',
  props: {
    className: 'foo  baz'
  },
  children: null
};

exports.iterations = 1000000;
