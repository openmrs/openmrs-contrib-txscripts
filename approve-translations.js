require('dotenv').config();
var rp = require('request-promise');
var _ = require("lodash");
var md5 = require("md5");

var TRANSIFEX_BASE = "https://www.transifex.com/api/2/";

var SKIP = ["openmrs-core"];

var auth = {
    user: process.env.TX_USERNAME,
    pass: process.env.TX_PASSWORD
};
var opts = {
    json: true,
    auth: auth
};

var alreadyReviewed = 0;

rp(_.merge({
               uri: TRANSIFEX_BASE + "project/OpenMRS",
               qs: {
                   details: "true"
               }
           }, opts)).then(function (allProjects) {
    var resources = _.filter(allProjects.resources, function (val) {
        return _.indexOf(SKIP, val.slug) < 0
    });
    console.log("There are " + resources.length + " resources");

    resources.forEach(function (resource) {
        console.log(resource.slug);

        rp(_.merge({
                       uri: TRANSIFEX_BASE + "project/OpenMRS/resource/" + resource.slug,
                       qs: {
                           details: "true"
                       }
                   }, opts)).then(function (resource) {
            console.log("languages: " + resource.available_languages.length);
            var languageCodes = _.map(resource.available_languages, "code");

            languageCodes.forEach(function (languageCode) {
                if (languageCode == resource.source_language_code) {
                    return;
                }
                rp(_.merge({
                               uri: TRANSIFEX_BASE + "project/OpenMRS/resource/" + resource.slug + "/translation/" + languageCode + "/strings"
                           }, opts)).then(function (allTranslations) {
                    var needsReview = allTranslations.filter(function (it) {
                        return it.translation && !it.reviewed;
                    });
                    allTranslations.forEach(function (it) {
                        if (it.reviewed) {
                            alreadyReviewed += 1;
                            console.log("Already reviewed: " + alreadyReviewed);
                        }
                    })
                    needsReview.forEach(function (it) {
                        var hash = md5([it.key, ""].join(":"));
                        rp({
                               method: "PUT",
                               uri: TRANSIFEX_BASE + "project/OpenMRS/resource/" + resource.slug + "/translation/" + languageCode + "/string/" + hash + "/",
                               auth: auth,
                               json: {
                                   translation: it.translation,
                                   reviewed: true
                               }
                           }).then(function (response) {
                            console.log("Marked as reviewed: " + resource.slug + " " + languageCode + " " + it.key + " = " + it.translation);
                        })
                    });
                })
            });
        });
    });
}).catch(function (err) {
    console.log(err.message);
});
