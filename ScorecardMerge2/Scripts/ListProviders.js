/// <autosync enabled="true" />
/// <reference path="modernizr-2.6.2.js" />
/// <reference path="jquery-1.10.2.js" />
/// <reference path="jquery.validate.js" />
/// <reference path="jquery.validate.unobtrusive.js" />
/// <reference path="bootstrap.js" />
/// <reference path="respond.js" />
/// <reference path="d3.js" />

var state;

// -----------------------------------
// Initialisation
// -----------------------------------
(function initialisePage() {
    state = {
        providerpage: 1,
        providerXhr: null,
        lastprn: null,
        showmenu: true
    };

    renderMoreProviders();

    var requestedPrn = currentRequestedProvider();
    if (!!requestedPrn) {
        setMode("view-details");
        getProviderDetails(requestedPrn);
        
    } else {
        setMode("main");
    };
})();


// ---------------------------------
// Event listeners
// ---------------------------------
window.onhashchange = function navigate() {
    var requestedPrn = currentRequestedProvider();
    if (!!requestedPrn) {
        getProviderDetails(requestedPrn);
    } else {
        setMode("main");

        //cause the provider to flash within the list
        var $providerbox = $("div[data-ukprn='" + state.lastprn + "']");
        if ($providerbox.length) {
            $(window).scrollTop($providerbox.offset().top - 150);
            $providerbox.addClass("bump");
            setTimeout(function () { $providerbox.removeClass("bump") }, 3000);
        }
    }
};


$(document).on("click", ".get-providerdetails", function (e) {
    currentRequestedProvider($(this).data("ukprn"));
});

$(document).on("touchstart", ".get-providerdetails", function (e) {
    e.prevenDefault();
    e.stopPropagation();
    return true;
})

$(document).on("click", ".prevent-propagation", function (event) {
    event.stopPropagation();
    return true;
});

//when scrolling to the bottom of the list, load more Providers
$(window).scroll(function () {
    checkScrollState();
});

$(document).on("mouseover", ".bar", function (e) {
    $(".datatooltip").remove();
    renderTooltip($(this))

}).on("mouseout", ".bar", function (e) {
    $(".datatooltip").remove();
});

// filter menu
$("#menu-button").click(updateFilterVisibility)

$('#find-provider input').keypress(debounce(findProvider, 500))
$('#find-provider-subject').change(debounce(findProvider, 100))
$('#find-provider-distance').change(debounce(function () { if ($("#find-provider-postcode").val() !== "") findProvider(); }, 100))

$("#sortby").change(debounce(findProvider), 100);

$("#clear-search").click(function (e) {
    $("#find-provider-provider").val("");
    $("#find-provider-subject").val("0");
    $("#find-provider-postcode").val("");
    $("#find-provider-distance").val("5");
    findProvider();
})


$("#close-search").click(function () {
    updateFilterVisibility(false)
});

function findProvider(e) {
    renderMoreProviders(true);
}

function updateFilterVisibility(pNewVal) {
    var newVal = pNewVal === true || pNewVal === false
        ? pNewVal
        : !state.showmenu;

    state.showmenu = newVal;
    if (state.showmenu) {
        $("#menu-button").addClass("active");
        $("#find-provider").addClass("active");
    } else {
        $("#menu-button").removeClass("active");
        $("#find-provider").removeClass("active");
    }
}

// -----------------------------------
// DOM Manipulation
// -----------------------------------
function setMode(mode) {
    $('.body-content').attr("mode", mode);
    setTimeout(renderNewGraphs);
}

function renderMoreProviders(reset) {
    if (reset) {
        $("#scrollTo").show();
        $("#noResults").hide();
        state.providerpage = 1;
    }

    var postdata = {
        page: state.providerpage,
        search: $("#find-provider-provider").val(),
        subject: parseFloat($('#find-provider-subject').val()) || null,
        postcode: $("#find-provider-postcode").val(),
        distance: parseInt($("#find-provider-distance").val()) || null,
        sortby: $("#sortby").val()
    }

    fetchProviders({
        postdata: postdata,
        holdTheLine: reset ? function () { $("#providers-all").html(""); } : null,
        callback: function (result, end) {
            if (end) {
                $("#scrollTo").hide();
                var noResultsAtAll = result.length + $(".singleProvider").length === 0;
                if (noResultsAtAll) {
                    $("#noResults").show();
                }
            } 
            state.providerpage += 1;
            
            if (reset) {
                $("#providers-all").html("");
            }
            var rendered = Mustache.render($('#bunchOfProviders-template').html(), result);
            $('#providers-all').append(rendered);
            injectDataIntoNewGraphContainers(result, postdata.subject);
            renderNewGraphs();

            var currentProviderUnknown = currentRequestedProvider() && $(".singleProvider[data-ukprn='"+ currentRequestedProvider() +"']").length === 0;
            if (currentProviderUnknown) {
                renderMoreProviders();
            } else {
                checkScrollState();
            }
        }
    })
}

function getProviderDetails(ukprn) {
    state.lastprn = ukprn;

    fetchProviderDetails({
        ukprn: ukprn,
        holdTheLine: function () {
            setMode("view-details");
            $("#details-container").html(Mustache.render($("#loading-template").html(), { message: "Loading, please wait&hellip;" }));
        },
        callback: function (provider) {
            setMode("view-details");
            var rendered = Mustache.render($('#providerDetails-template').html(), provider);
            $('#details-container').html(rendered);
            injectDataIntoNewGraphContainers([provider])
            renderNewGraphs();
        }
    })
}

function injectDataIntoNewGraphContainers(results, primarysubject) {
    var lot = $(".graph-container.empty")
    lot.each(function (i, elem) {
        $(elem).data("ukprn");
        var prov = results.find(function (x) { return x.ukprn === $(elem).data("ukprn") });
        if (!prov) { return; }
        var subject = $(elem).data("subjectcode") || primarysubject || 0;
        var data = prov.apprenticeships.find(function (x) { return x.subject_tier_2_code === subject });
        $(elem).prop("__data__", data.performanceData);
    });
}

var checkScrollState = debounce(function () {
    if (isInView($("#scrollTo"), 100)) {
        renderMoreProviders();
    }
}, 50);




