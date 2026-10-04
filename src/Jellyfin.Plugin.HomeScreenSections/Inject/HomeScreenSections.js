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

// Seerr popup: shows Seerr in a modal iframe on top of whatever Jellyfin page is open.
// Links marked with data-hss-seerr open it instead of leaving the page.
window.HSSSeerr = window.HSSSeerr || (function () {
    var overlay = null;
    var previousOverflow = '';

    function onKeyDown(event) {
        if (event.key === 'Escape') {
            close();
        }
    }

    function close() {
        if (!overlay) {
            return;
        }

        document.removeEventListener('keydown', onKeyDown, true);
        overlay.remove();
        overlay = null;
        document.body.style.overflow = previousOverflow;
    }

    function open(url) {
        if (!url) {
            return;
        }

        // A browser blocks an http iframe inside an https page; use a new tab in that case.
        if (window.location.protocol === 'https:' && url.indexOf('http:') === 0) {
            window.open(url, '_blank', 'noopener');
            return;
        }

        close();

        overlay = document.createElement('div');
        overlay.id = 'hss-seerr-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.72);';
        overlay.addEventListener('click', function (event) {
            if (event.target === overlay) {
                close();
            }
        });

        var panel = document.createElement('div');
        panel.style.cssText = 'display:flex;flex-direction:column;width:min(1400px,94vw);height:92vh;background:#101010;border-radius:10px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.6);';

        var bar = document.createElement('div');
        bar.style.cssText = 'display:flex;align-items:center;gap:.5em;padding:.4em .8em;background:#1b1b1b;color:#eee;flex:0 0 auto;';
        var title = document.createElement('span');
        title.textContent = 'Seerr';
        title.style.cssText = 'flex:1;font-weight:600;';

        var newTab = document.createElement('a');
        newTab.href = url;
        newTab.target = '_blank';
        newTab.rel = 'noopener';
        newTab.title = 'Open in a new tab';
        newTab.textContent = '↗';
        newTab.style.cssText = 'color:inherit;text-decoration:none;font-size:1.3em;padding:0 .4em;';

        var closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.title = 'Close';
        closeButton.textContent = '✕';
        closeButton.style.cssText = 'background:none;border:0;color:inherit;font-size:1.3em;cursor:pointer;padding:0 .4em;';
        closeButton.addEventListener('click', close);

        bar.appendChild(title);
        bar.appendChild(newTab);
        bar.appendChild(closeButton);

        var frame = document.createElement('iframe');
        frame.src = url;
        frame.allow = 'fullscreen; clipboard-write';
        frame.style.cssText = 'flex:1 1 auto;width:100%;border:0;background:#111;';

        panel.appendChild(bar);
        panel.appendChild(frame);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', onKeyDown, true);
    }

    document.addEventListener('click', function (event) {
        var link = event.target.closest && event.target.closest('a[data-hss-seerr]');
        if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        open(link.href);
    }, true);

    return { open: open, close: close };
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
        link.href = '#';
        link.innerHTML = '<span class="material-icons navMenuOptionIcon explore" aria-hidden="true"></span>' +
            '<span class="sectionName navMenuOptionText">Seerr</span>';
        libraries.parentNode.insertBefore(link, libraries);
    }

    // The drawer entry opens the popup instead of navigating to a page.
    document.addEventListener('click', function (event) {
        var link = event.target.closest && event.target.closest('#' + linkId);
        if (!link) {
            return;
        }

        event.preventDefault();
        window.ApiClient.getJSON(window.ApiClient.getUrl('ModularHomeViews/seerr/url')).then(function (result) {
            window.HSSSeerr.open(result.Url);
        });
    }, true);

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
