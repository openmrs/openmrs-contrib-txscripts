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
    for (var resourceSlug in allResources) {
        var allLanguages = allResources[resourceSlug];
        for (languageKey in allLanguages) {
            var stats = allLanguages[languageKey];
            if (stats.translated_entities > 0) {
                var toDo = stats.translated_entities - stats.reviewed;
                if (toDo) {
                    console.log("Need to review " + toDo + " (out of " + stats.translated_entities + ") for " + languageKey + " for " + resourceSlug);
                }
                //console.log(resourceSlug + "\t" + languageKey + "\t" + stats.reviewed + " / " + stats.translated_entities);
            }
        }
    }
});