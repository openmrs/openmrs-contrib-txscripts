require('dotenv').config();
var Transifex = require("transifex");

var transifex = new Transifex({
                                  project_slug: "OpenMRS",
                                  credential: [process.env.TX_USERNAME, process.env.TX_PASSWORD].join(":")
                              });

transifex.projectStatisticsMethods(function (err, allResources) {
    if (err) {
        console.log(err.response.statusCode + " " + err.response.statusMessage);
        console.log(err.response.request.headers);
    }
    else {
        let withTranslations = 0;
        let withoutTranslations = 0;
        console.log(`resource,language,translated,untranslated`);
        for (var resourceSlug in allResources) {
            var allLanguages = allResources[resourceSlug];
            for (languageKey in allLanguages) {
                var stats = allLanguages[languageKey];
                if (stats.translated_entities > 0) {
                    console.log(`${resourceSlug},${languageKey},${stats.translated_entities},${stats.untranslated_entities}`);
                    withTranslations += 1;
                }
                else {
                    withoutTranslations += 1;
                }
            }
        }
        console.log();
        console.log(`with,${withTranslations},without,${withoutTranslations}`);
    }
});