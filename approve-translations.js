require('dotenv').config();
const fetch = require('isomorphic-fetch');
const md5 = require('md5');
const base64 = require('base-64');

const TRANSIFEX_BASE = "https://www.transifex.com/api/2/";

const EXCLUDE_RESOURCES = ["openmrs-core"];

const IS_DEBUG = process.env.NODE_ENV !== 'production';

let totalMarkedAsReviewed = 0;
let totalFailedToMarkAsReviewed = 0;
let totalAlreadyReviewed = 0;

const fetchOpts = {
    headers: new Headers({
        'Authorization': `Basic ${base64.encode(process.env.TX_USERNAME + ':' + process.env.TX_PASSWORD)}`,
        'Accept': 'application/json'
    })
};

const putOpts = {
    method: 'PUT',
    headers: new Headers({
        'Authorization': `Basic ${base64.encode(process.env.TX_USERNAME + ':' + process.env.TX_PASSWORD)}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    })
}

function jsonResponse(response) {
    if (response.status >= 200 && response.status < 300) {
        return response.json();
    }
    else {
        throw {message: `${response.url} => ${response.status} ${response.statusText}`};
    }
}

function logObject(object) {
    console.log(object);
    return object;
}

function handleError(error) {
    console.log("ERROR!");
    console.log(error.message ? error.message : error);
}

function curryHandleError(forWhat) {
    return function handleError(error) {
        console.log("---ERROR FOR------------------");
        console.log(forWhat);
        console.log("------------------------------");
        console.log(error.message ? error.message : error);
        console.log("------------------------------");
    }
}

function curryHandleLanguage(resource, languageCode) {
    return function (allTranslations) {
        const needsReview = allTranslations.filter(it => it.translation && !it.reviewed);
        const alreadyReviewed = allTranslations.length - needsReview.length;
        totalAlreadyReviewed += alreadyReviewed;
        console.log(`${resource.slug} ${languageCode} has ${needsReview.length} to review (and ${alreadyReviewed} already reviewed)`);
        const promises = [];
        needsReview.forEach(it => {
            const useOpts = Object.assign({
                                              body: JSON.stringify({
                                                                       translation: it.translation,
                                                                       reviewed: true
                                                                   })
                                          }, putOpts);
            const hash = md5([it.key, ""].join(":"));
            const uri = `${TRANSIFEX_BASE}project/OpenMRS/resource/${resource.slug}/translation/${languageCode}/string/${hash}/`;
            promises.push(
                    fetch(uri, useOpts)
                            .then(response => {
                                if (response.ok) {
                                    console.log(`Marked as reviewed: ${resource.slug} ${languageCode} ${it.key}=${it.translation}`);
                                    totalMarkedAsReviewed += 1;
                                }
                                else {
                                    console.log(`Failed to mark as reviewed: ${resource.slug} ${languageCode} ${it.key}=${it.translation}: ${response.status} ${response.statusText}`);
                                    totalFailedToMarkAsReviewed += 1;
                                }
                            })
                            .catch(curryHandleError("PUT " + uri))
            );
        });
        return Promise.all(promises);
    }
}

function handleResource(resource) {
    if (IS_DEBUG) {
        console.log(`${resource.slug} has ${resource.available_languages.length} languages`);
    }

    const languageCodes = resource.available_languages.map(l => l.code);

    const promises = [];
    languageCodes.forEach(languageCode => {
        if (languageCode == resource.source_language_code) {
            if (IS_DEBUG) {
                console.log(`Skipping source language ${languageCode}`);
            }
            return;
        }
        const handleLanguage = curryHandleLanguage(resource, languageCode);
        const uri = `${TRANSIFEX_BASE}project/OpenMRS/resource/${resource.slug}/translation/${languageCode}/strings`;
        promises.push(
                fetch(uri, fetchOpts)
                        .then(jsonResponse)
                        .then(handleLanguage)
                        .catch(curryHandleError(uri))
        );
    });
    return Promise.all(promises);
}

function handleProject(project) {
    const resources = project.resources.filter(val => EXCLUDE_RESOURCES.indexOf(val.slug) < 0);
    console.log(`Will handle ${resources.length} resources`);

    const promises = [];
    resources.forEach(resource => {
        if (IS_DEBUG) {
            console.log(`Handling ${resource.slug}`);
        }

        promises.push(
                fetch(`${TRANSIFEX_BASE}project/OpenMRS/resource/${resource.slug}?details=true`, fetchOpts)
                        .then(jsonResponse)
                        .then(handleResource)
                        .catch(curryHandleError(resource.slug))
        );
    });
    return Promise.all(promises);
}

fetch(`${TRANSIFEX_BASE}project/OpenMRS?details=true`, fetchOpts)
        .then(jsonResponse)
        .then(handleProject)
        .then(() => {
            console.log("DONE!");
            console.log("Reviewed: " + totalMarkedAsReviewed);
            console.log("Failed to mark: " + totalFailedToMarkAsReviewed);
            console.log("(ignored " + totalAlreadyReviewed + " that were already reviewed)");
            return "DONE";
        })
        .catch(handleError);
