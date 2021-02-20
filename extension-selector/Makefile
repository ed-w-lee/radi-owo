.PHONY: package clean
package:
	npm run build-prod
	cd publish/ && zip -r ../radiowo.zip . -x '*.gitignore*'

clean:
	rm -f publish/build/*.js publish/build/*.html publish/build/*.css
	rm -f publish/build/manifest.json
	rm -f radiowo.zip
