exports.input = [
  {
    type: 'tag',
    name: 'div',
    props: {
      '&props': {
        expressions: [
          '{name: "foo"}',
          '{style: {color: "red"}}',
          '{style: {background: "blue"}}'
        ]
      }
    },
    buffer: true
  }
];

exports.output = {
  tag: 'div',
  props: {
    name: 'foo',
    style: {
      background: 'blue',
      color: 'red'
    }
  },
  children: null
};

exports.iterations = 1000000;
