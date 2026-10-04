using System.Reflection;
using System.Text.RegularExpressions;
using Jellyfin.Plugin.HomeScreenSections.Attributes;
using Jellyfin.Plugin.HomeScreenSections.Model;
using MediaBrowser.Common.Net;

namespace Jellyfin.Plugin.HomeScreenSections.Helpers
{
    public static class TransformationPatches
    {
        public static string LoadSections(PatchRequestPayload content)
        {
            // replace `",loadSections:` with itself followed by our function followed by `",originalLoadSections:`
            Stream replacementStream = Assembly.GetExecutingAssembly().GetManifestResourceStream($"{typeof(HomeScreenSectionsPlugin).Namespace}.Controllers.loadSections.js")!;
            using TextReader replacementTextReader = new StreamReader(replacementStream);
        
            string[] parts = content.Contents!.Split(",loadSections:", StringSplitOptions.RemoveEmptyEntries);
            Regex variableFind = new Regex(@"var\s+([a-zA-Z][^=]*)=");
            string thisVariableName = variableFind.Matches(parts[0]).Last().Groups[1].Value;
            string replacementText = replacementTextReader.ReadToEnd()
                .Replace("{{this_hook}}", thisVariableName);

            if (JellyfinVersionAttribute.GetVersion()?.StartsWith("10.10.7") ?? false)
            {
                replacementText = replacementText.Replace("{{cardbuilder_hook}}", "h.default");
                replacementText = replacementText.Replace("{{appRouterParent_hook}}", "p");
                replacementText = replacementText.Replace("{{shapebuilder_hook}}", "y");
                replacementText = replacementText.Replace("{{layoutmanager_hook}}", "n"); // TODO: lookup the first "assigned" variable after `var`
            }
            else if (JellyfinVersionAttribute.GetVersion()?.StartsWith("10.11") ?? false)
            {
                replacementText = replacementText.Replace("{{cardbuilder_hook}}", "u.default");
                replacementText = replacementText.Replace("{{appRouterParent_hook}}", "p");
                replacementText = replacementText.Replace("{{shapebuilder_hook}}", "y");
                replacementText = replacementText.Replace("{{layoutmanager_hook}}", "n"); // TODO: lookup the first "assigned" variable after `var`
            }
            else if (JellyfinVersionAttribute.GetVersion()?.StartsWith("12.") ?? false)
            {
                replacementText = replacementText.Replace("{{cardbuilder_hook}}", "p.Ay");
                replacementText = replacementText.Replace("{{appRouterParent_hook}}", "T");
                replacementText = replacementText.Replace("{{shapebuilder_hook}}", "I");
                replacementText = replacementText.Replace("{{layoutmanager_hook}}", "r(46782)"); // TODO: lookup the first "assigned" variable after `var`
            }
            
            string regex = content.Contents.Replace(",loadSections:", $",loadSections:{replacementText},originalLoadSections:");

            return regex;
        }

        /// <summary>
        /// jellyfin-web's router strips ".html" from in-app navigations (replaceState), so Plugin Pages' links to
        /// "userpluginsettings.html" end up on "userpluginsettings", which has no route. Register that route too.
        /// </summary>
        public static string MainBundle(PatchRequestPayload content)
        {
            const string alias = "{path:\"userpluginsettings\",pageProps:{controller:\"user/plugin/index\",view:\"user/plugin/index.html\"}},";
            const string anchor = "{path:\"queue\",pageProps:";

            string contents = content.Contents!;
            if (contents.Contains("{path:\"userpluginsettings\",") || !contents.Contains(anchor))
            {
                return contents;
            }

            return contents.Replace(anchor, alias + anchor);
        }

        public static string IndexHtml(PatchRequestPayload content)
        {
            NetworkConfiguration networkConfiguration = HomeScreenSectionsPlugin.Instance.ServerConfigurationManager.GetNetworkConfiguration();
            var pluginConfig = HomeScreenSectionsPlugin.Instance.Configuration;

            string rootPath = "";
            if (!string.IsNullOrWhiteSpace(networkConfiguration.BaseUrl))
            {
                rootPath = $"/{networkConfiguration.BaseUrl.TrimStart('/').Trim()}";
            }
            
            string pluginVersion = HomeScreenSectionsPlugin.Instance.GetCurrentPluginVersion();

            string cacheParam;
            if (pluginConfig.DeveloperMode)
            {
                // Developer mode: Add timestamp
                cacheParam = $"?v={pluginVersion}&t={DateTimeOffset.UtcNow.Ticks}";
            }
            else
            {
                // Normal mode: Use version + cache bust counter
                cacheParam = $"?v={pluginVersion}&c={pluginConfig.CacheBustCounter}";
            }

            string replacementText0 = $"<link rel=\"stylesheet\" href=\"{rootPath}/HomeScreen/home-screen-sections.css{cacheParam}\" />";
            string replacementText1 = $"<script type=\"text/javascript\" plugin=\"Jellyfin.Plugin.HomeScreenSections\" src=\"{rootPath}/HomeScreen/home-screen-sections.js{cacheParam}\" defer></script>";
            
            // The main bundle is patched by MainBundle but keeps jellyfin-web's own content hash in its URL, so
            // browsers/CDNs holding the unpatched file would never refetch it. Tag the URL with the plugin's cache key.
            string html = Regex.Replace(content.Contents!, @"(main\.jellyfin\.bundle\.js\?[^""']+)", $"$1&hss={pluginVersion}.{pluginConfig.CacheBustCounter}");

            return html
                .Replace("</head>", $"{replacementText0}</head>")
                .Replace("</body>", $"{replacementText1}</body>");
        }
    }
}