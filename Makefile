MOCHA = ./node_modules/.bin/mocha

test:
	@$(MOCHA) test/index.text.js --timeout 10000
	@$(MOCHA) --reporter dot test/generated.test.js --timeout 10000

clean:
	rm -f .tests/*.js* .tests/*.txt

.PHONY: test clean
