'use strict';

// Plugin Pages registers the user settings route as "userpluginsettings.html". Links cached by older
// Plugin Pages versions point at "userpluginsettings" (no extension), which jellyfin-web answers with "Page not found".
(function () {
    function fixPluginSettingsRoute() {
        var fixed = window.location.hash.replace(/^#\/userpluginsettings(\?|$)/, '#/userpluginsettings.html$1');
        if (fixed !== window.location.hash) {
            window.location.replace(fixed);
        }
    }

    fixPluginSettingsRoute();
    window.addEventListener('hashchange', fixPluginSettingsRoute);
})();

// Plugin Pages only lists plugin pages under "Plugin Settings" in the user menu. Add a direct "Seerr" entry
// to the main navigation drawer when the Seerr page is enabled for the current user.
(function () {
    var linkId = 'hss-seerr-link';
    var seerrPageId = 'Jellyfin.Plugin.HomeScreenSections.Seerr';
    var seerrAvailable = null;
    var requested = false;

    function loadAvailability() {
        if (requested || !window.ApiClient || !window.ApiClient.getCurrentUserId || !window.ApiClient.getCurrentUserId()) {
            return;
        }

        requested = true;
        window.ApiClient.getJSON(window.ApiClient.getUrl('PluginPages/User')).then(function (result) {
            seerrAvailable = (result.Items || []).some(function (item) { return item.Id === seerrPageId; });
            addSeerrLink();
        }, function () {
            requested = false;
        });
    }

    function addSeerrLink() {
        if (!seerrAvailable || document.getElementById(linkId)) {
            return;
        }

        var drawer = document.querySelector('.mainDrawer-scrollContainer');
        var libraries = drawer && drawer.querySelector('.libraryMenuOptions');
        if (!libraries) {
            return;
        }

        var link = document.createElement('a');
        link.id = linkId;
        link.setAttribute('is', 'emby-linkbutton');
        link.className = 'navMenuOption lnkMediaFolder';
        link.href = '#/userpluginsettings.html?pageUrl=/ModularHomeViews/seerr';
        link.innerHTML = '<span class="material-icons navMenuOptionIcon explore" aria-hidden="true"></span>' +
            '<span class="sectionName navMenuOptionText">Seerr</span>';
        libraries.parentNode.insertBefore(link, libraries);
    }

    function onDomChange() {
        if (seerrAvailable === null) {
            loadAvailability();
        } else {
            addSeerrLink();
        }
    }

    new MutationObserver(onDomChange).observe(document.documentElement, { childList: true, subtree: true });
    onDomChange();
})();

if (typeof HomeScreenSectionsHandler == 'undefined') {
    const HomeScreenSectionsHandler = {
        init: function() {
            var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
            var myObserver = new MutationObserver(this.mutationHandler);
            var observerConfig = {childList: true, characterData: true, attributes: true, subtree: true};

            $("body").each(function () {
                myObserver.observe(this, observerConfig);
            });
        },
        mutationHandler: function (mutationRecords) {
            mutationRecords.forEach(function (mutation) {
                if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                    [].some.call(mutation.addedNodes, function (addedNode) {
                        if ($(addedNode).hasClass('discover-card')) {
                            $(addedNode).on('click', '.discover-requestbutton', HomeScreenSectionsHandler.clickHandler);
                        }
                    });
                }
            });
        },
        clickHandler: function(event) {
            window.ApiClient.ajax({
                url: window.ApiClient.getUrl("HomeScreen/DiscoverRequest"),
                type: "POST",
                data: JSON.stringify({
                    UserId: window.ApiClient._currentUser.Id,
                    MediaType: $(this).data('media-type'),
                    MediaId: $(this).data('id'),
                }),
                contentType: 'application/json; charset=utf-8',
                dataType: 'json'
            }).then(function(response) {
                if (response.errors && response.errors.length > 0) {
                    Dashboard.alert("Item request failed. Check browser logs for details.");
                    console.error("Item request failed. Response including errors:");
                    console.error(response);
                } else {
                    Dashboard.alert("Item successfully requested");
                }
            }, function(error) {
                Dashboard.alert("Item request failed");
            })
        }
    };
    
    $(document).ready(function () {
        setTimeout(function () {
            HomeScreenSectionsHandler.init();
        }, 50);
    });
}

if (typeof TopTenSectionHandler == 'undefined') {
    const TopTenSectionHandler = {
        init: function () {
            var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
            var myObserver = new MutationObserver(this.mutationHandler);
            var observerConfig = {childList: true, characterData: true, attributes: true, subtree: true};

            $("body").each(function () {
                myObserver.observe(this, observerConfig);
            });
        },
        mutationHandler: function (mutationRecords) {
            mutationRecords.forEach(function (mutation) {
                if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                    [].some.call(mutation.addedNodes, function (addedNode) {
                        if ($(addedNode).hasClass('card')) {
                            if ($(addedNode).parents('.top-ten').length > 0) {
                                var index = parseInt($(addedNode).attr('data-index'));
                                $(addedNode).attr('data-number', index + 1);
                            }
                        }
                    });
                }
            });
        }
    }

    setTimeout(function () {
        TopTenSectionHandler.init();
    }, 50);
}
