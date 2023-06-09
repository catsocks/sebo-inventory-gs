# Sebo inventory

[Google Apps Script](https://developers.google.com/apps-script) for managing
an inventory spreadsheet.

The text for the menu items, alerts and prompts are in Portuguese. Everything
else is in English.

[Code.js](src/Code.js) is a good starting point to explore this project.

## Develop

I recommend using [Clasp](https://github.com/google/clasp) to make it easier
to develop the project locally.

The following Clasp commands are particularly useful:

- `clasp push --watch` — Watch for changes and automatically push updated files.
- `clasp run runTests` — Run the tests defined in [Test.js](src/Test.js).
- `clasp logs --simplified` — Show logs. Useful when tests fail.

Tip: Use `npx` to run Clasp after installing this project's dev dependencies,
like so: `npx clasp push --watch`.

Keep in mind that in order to get `clasp run` to work, you'll have to follow 
[these instructions](https://github.com/google/clasp/blob/master/docs/run.md).

Additionally, in order for the above instructions to work, you will need to
enable the _Apps Script API_ in the GCP project associated with this script by
visting the link below:

	https://console.cloud.google.com/apis/library/script.googleapis.com?project=<projectId>

## To do

- [ ] Use `@types/google-apps-script` type definitions in the JSDoc comments.

## License

[0BSD](LICENSE)
