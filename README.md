# Sebo inventory

[Google Apps Script](https://developers.google.com/apps-script) for helping me
with an inventory spreadsheet.

The text for the menu items, alerts and prompts are in Portuguese. Everything
else is in English.

[Code.js](src/Code.js) is a good starting point to explore the code.

## Forking

I recommend you familiarize yourself with
[Clasp](https://github.com/google/clasp) so you may conveniently edit the code
outside the Apps Script editor.

The following Clasp commands are particularly useful:

- `clasp push --watch` — Automatically watch for changes and push them.
- `clasp run runTests` — Run the tests defined in [Test.js](src/Test.js).
- `clasp logs --simplified` — Show logs. Useful when tests fail.

Tip: Use `npx` to run Clasp after installing this project's dev dependencies,
like so: `npx clasp push --watch`.

Keep in mind that in order to get `clasp run` to work, you'll have to follow 
[these instructions](https://github.com/google/clasp/blob/master/docs/run.md).

Additionally, in order for the above instructions to work, you will need to
enable the _Apps Script API_ in the GCP project associated with this script by
visting the link below:

	`https://console.cloud.google.com/apis/library/script.googleapis.com?project=<projectId>`

## To-do

- [ ] Use `@types/google-apps-script` type definitions in the JSDoc comments.

## License

[0BSD](LICENSE)
