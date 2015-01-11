MOCHA = ./node_modules/.bin/mocha

test:
	@$(MOCHA) test/index.text.js
	@$(MOCHA) --reporter dot test/generated.test.js

clean:
	rm -f .tests/*.js* .tests/*.txt

.PHONY: test clean
