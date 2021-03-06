/// <autosync enabled="true" />
/// <reference path="modernizr-2.6.2.js" />
/// <reference path="jquery-1.10.2.js" />
/// <reference path="jquery.validate.js" />
/// <reference path="jquery.validate.unobtrusive.js" />
/// <reference path="bootstrap.js" />
/// <reference path="respond.js" />
/// <reference path="d3.js" />

// -----------------------------------
// AJAX
// -----------------------------------
var providerXhr = null;
function fetchProviders(options) {
    var postdata = options.postdata,
        callback = options.callback,
        holdTheLine = options.holdTheLine;

    if (!!providerXhr) {
        if (options.force) {
            providerXhr.abort();
            providerXhr = null;
        } else {
            // don't launch another request while a valid one is in flight
            return;
        }
    }
    var holdTheLineHandle = null;
    if ($.isFunction(holdTheLine)) {
        holdTheLineHandle = setTimeout(holdTheLine, 300);
    }
    providerXhr = $.ajax({
        url: "/Apprenticeship/ListData",
        dataType: "json",
        method: "POST",
        data: {
            page: postdata.page,
            subjectcode: postdata.subject,
            search: postdata.search,
            postcode: postdata.postcode,
            distance: postdata.distance,
            sortby: postdata.sortby
        },
        success: function (data) {
            providerXhr = null;

            if (holdTheLineHandle) { clearTimeout(holdTheLineHandle); }

            $.each(data.apprenticeships.results, function (i, ship) {
                ship.provider.name = toTitleCase(ship.provider.name);
                if (ship.distance) ship.distance = ship.distance.toFixed(ship.distance < 10 ? 1 : 0);
                sanitiseApprenticeship(ship, false);
            });
            callback(data.apprenticeships, data.location, data.end);
        },
        complete: function () {
            providerXhr = null;
        }
    });
};

var detailsXhr = null;
function fetchProviderDetails(options) {
    if (!!detailsXhr) {
        return;
    }
    var holdTheLine = options.holdTheLine,
        callback = options.callback,
        data = options.data;

    var holdTheLineHandle = null;
    if ($.isFunction(holdTheLine)) {
        holdTheLineHandle = setTimeout(holdTheLine, 300);
    }

    detailsXhr = $.ajax({
        url: "/Apprenticeship/ProviderData",
        data: data,
        method: "POST",
        success: function (provider) {
            detailsXhr = null;
            if (holdTheLineHandle) {
                clearTimeout(holdTheLineHandle);
            }

            provider.name = toTitleCase(provider.name);
            $.each(provider.apprenticeships, function (i, val) { sanitiseApprenticeship(val,true); });
            sanitiseApprenticeship(provider.primary, true);
            callback(provider);
        },
        complete: function () {
            detailsXhr = null;
        }
    });
}

function sanitiseApprenticeship(data, isSubject) {
    var dataFormatted = []
    dataFormatted.push({
        type: "earnings",
        value: data && data.earnings && data.earnings.median,
        baseline: data && data.national_earnings && data.national_earnings.median
    });
    dataFormatted.push({
        type: "satisfaction",
        value: data && data.learner_stats && data.learner_stats.satisfaction,
        baseline: data && data.learner_stats && data.learner_stats.national_satisfaction
    });
    dataFormatted.push({
        type: "passrate",
        value: data && data.stats && data.stats && data.stats.achievement_rate,
        baseline: data && data.national_stats && data.national_stats.achievement_rate
    });
    if (data && data.earnings) {
        data.earnings.percentage_above_21k = 100 * data.earnings.proportion_above_21k;
    }
    data.performanceData = dataFormatted.map(function (x) { return formatPerformanceData(x, isSubject); });
}

function formatPerformanceData(data, isSubject) {
    var elementDescriptor = isSubject
    ? "course"
    : "training provider";
    var inorwith = isSubject
        ? "in" : "with";

    var noData = !data || !data.value;
    var noDataDescriptor = !data.type ? "No data available"
                : data.type === "earnings" ? "There is no data available on pay to learners after training with this " + elementDescriptor + "."
                : data.type === "satisfaction" ? "There is no data available on scores given by learners for this " + elementDescriptor + "."
                : data.type === "passrate" ? "There is no data available on learners who completed their training with this " + elementDescriptor + "."
                : "No data available"

    var res = {
        type: data.type,
        value: data.value,
        baseline: data.baseline,
        noData: noData,
        noDataDescriptor: noDataDescriptor,
        moreorless: data.value < data.baseline ? "less" : "more",
        higherorlower: data.value < data.baseline ? "lower" : "higher",
        betterorworse: data.value < data.baseline ? "worse" : "better",
        elementdescriptor: elementDescriptor,
        inorwith: inorwith
    };

    if (noData) { 
        res.valueFormatted = "-";
        res.difference = "-";
    } else {
        switch (data.type) {
            case "earnings":
                res.valueFormatted = "£" + toMoneyString(data.value);
                res.difference = "£" + toMoneyString(Math.abs(data.value - data.baseline));
                break;
            case "passrate":
                res.valueFormatted = data.value.toFixed(0)+"%";
                res.difference = Math.abs(data.value - data.baseline).toFixed(0);
                break;
            case "satisfaction":
                res.valueFormatted = data.value.toFixed(0)+"%";
                res.difference = Math.abs(data.value - data.baseline).toFixed(0);
                break;
            default: throw new "unknown data type: " + data.type;
        }
    }
    return res;
}

function toTitleCase(str) {
    //http://stackoverflow.com/questions/196972/convert-string-to-title-case-with-javascript
    return str.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
}
