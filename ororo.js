/*
 *  ororo.tv  - Movian Plugin
 *
 *  Copyright (C) 2014-2015 Buksa, lprot
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
//ver 0.6.2
(function(plugin) {
    var plugin_info = plugin.getDescriptor();
    var PREFIX = plugin_info.id;
    var USER_AGENT = 'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36';
    var BASE_URL = 'http://ororo.tv';
    var logo = plugin.path + plugin_info.icon;
    var loggedIn = false;
    var tos = 'The developer has no affiliation with the sites what so ever.\n';
    tos += 'Nor does he receive money or any other kind of benefits for them.\n\n';
    tos += 'The software is intended solely for educational and testing purposes,\n';
    tos += 'and while it may allow the user to create copies of legitimately acquired\n';
    tos += 'and/or owned content, it is required that such user actions must comply\n';
    tos += 'with local, federal and country legislation.\n\n';
    tos += 'Furthermore, the author of this software, its partners and associates\n';
    tos += 'shall assume NO responsibility, legal or otherwise implied, for any misuse\n';
    tos += 'of, or for any loss that may occur while using plugin.\n\n';
    tos += 'You are solely responsible for complying with the applicable laws in your\n';
    tos += 'country and you must cease using this software should your actions during\n';
    tos += 'plugin operation lead to or may lead to infringement or violation of the\n';
    tos += 'rights of the respective content copyright holders.\n\n';
    tos += "plugin is not licensed, approved or endorsed by any online resource\n ";
    tos += "proprietary. Do you accept this terms?";
    // Register a service (will appear on home page)
    var service = plugin.createService("Ororo.tv", PREFIX + ":start", "video", true, logo);
    //settings
    var settings = plugin.createSettings("Ororo.tv", logo, plugin_info.synopsis);
    //var main_menu_order = plugin.createStore('main_menu_order', true);
    var items = [];
    var items_tmp = [];
    settings.createInfo("info", logo, "Plugin developed by " + plugin_info.author + ". \n");
    settings.createDivider('Settings:');
    settings.createBool("tosaccepted", "Accepted TOS (available in opening the plugin)", false, function(v) {
        service.tosaccepted = v;
    });
    settings.createBool("arrayview", "Show array view", false, function(v) {
        service.arrayview = v;
    });
    settings.createBool("thetvdb", "Show more information using thetvdb", false, function(v) {
        service.thetvdb = v;
    });
    settings.createBool("subs", "Show Subtitle from Ororo.tv ", true, function(v) {
        service.subs = v;
    });
    settings.createBool("debug", "Debug logging", false, function(v) {
        service.debug = v;
    });
    var Format = [
        ['.mp4', 'MP4', true],
        ['.webm', 'Webm/VP8']
    ];
    settings.createMultiOpt("Format", "Format", Format, function(v) {
        service.Format = v;
    });
    settings.createAction("logout", "Log out", function() {
        var request = showtime.httpReq(BASE_URL + '/users/sign_out', {
            noFollow: true,
            headers: {
                'Referer': BASE_URL,
                'User-Agent': USER_AGENT
            }
        });
        showtime.notify('Successfully logout from Orro.tv', 2);
    });
    plugin.addItemHook({
        title: "Search in Another Apps",
        itemtype: "video",
        handler: function(obj, nav) {
            var title = obj.metadata.title.toString();
            title = title.replace(/<.+?>/g, "").replace(/\[.+?\]/g, "");
            nav.openURL("search:" + title);
        }
    });
    //set header and cookies for ororo.tv
    plugin.addHTTPAuth("http:\/\/.*ororo.tv.*", function(authreq) {
        authreq.setHeader("User-Agent", "Mozilla/5.0 (Windows NT 6.2; WOW64; rv:25.0) Gecko/20100101 Firefox/25.0");
        authreq.setCookie("video", "true");
    });

    function login(query, authenticity_token) {
        var v;
        //var BASE_URL = showtime.httpReq('http://ororo.tv', {
        //    method: 'HEAD',
        //    noFollow: true,
        //    headers: {
        //        'User-Agent': USER_AGENT
        //    }
        //}).headers.Location;
        showtime.notify('Start login procedure from Ororo.tv', 5);
        if (loggedIn) return false;
        var reason = "Login required";
        var do_query = false;
        while (1) {
            var credentials = plugin.getAuthCredentials("Ororo.tv", reason, do_query);
            if (!credentials) {
                if (query && !do_query) {
                    do_query = true;
                    continue;
                }
                return "No credentials";
            }
            if (credentials.rejected) return "Rejected by user";
            try {
                v = showtime.httpReq(BASE_URL+'/users/sign_in', {
                    // noFollow: true,
                    postdata: {
                        utf8: '✓',
                        authenticity_token: authenticity_token,
                        'user[email]': credentials.username,
                        'user[password]': credentials.password,
                        'user[remember_me]': 1
                    },
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'Host': 'ororo.tv',
                        'Origin': 'http://ororo.tv',
                        'Referer': BASE_URL,
                        'X-CSRF-Token': authenticity_token,
                        'User-Agent': USER_AGENT,
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                }).toString();
            } catch (err) {
                p(err.message);
                reason = err.message;
                do_query = true;
                continue;
            }
            showtime.trace('Logged in to Ororo.tv as user: ' + credentials.username);
            loggedIn = true;
            return v;
        }
    }
    //First level start page
    plugin.addURI(PREFIX + ":start", function(page) {
        var i, v, remember_user_token, authenticity_token;
        if (!service.tosaccepted)
            if (showtime.message(tos, true, true)) service.tosaccepted = 1;
            else {
                page.error("TOS not accepted. plugin disabled");
                return;
            }
        if (service.arrayview) page.metadata.glwview = plugin.path + "views/array2.view";
        page.metadata.logo = logo;
        page.metadata.title = PREFIX;
        pageMenu(page);
        items = [];
        items_tmp = [];
        v = showtime.httpReq(BASE_URL + '/users/sign_in', {
            method: 'GET',
            headers: {
                'User-Agent': USER_AGENT
            }
        }).toString();
        p(v)
        if (/"email":"([^"]+)"/g.exec(v) === null) {

            if (v.match(/<meta content="(.*?)" name="csrf-token"/)) authenticity_token = v.match(/<meta content="(.*?)" name="csrf-token"/)[1];
            v = login(true, authenticity_token);
            if (v === 'Rejected by user') {
                page.error('You need to sign in or sign up before continuing.');
                return;
            }
        }
        if (/"email":"([^"]+)"/g.exec(v)) {
            page.appendItem("", "separator", {
                title: new showtime.RichText("Log in as " + (/"email":"([^"]+)"/g.exec(v)[1]))
            });
        }
        page.metadata.title = new showtime.RichText((/<title>(.*?)<\/title>/.exec(v)[1]));
        var show = v.split("<div class='index show");
        for (i = 1; i < show.length; i++) {
            var title = trim(match(/<div class='title'>([^<]+)/, show[i], 1));
            var url = match(/href="([^"]+)/, show[i], 1);
            var icon = BASE_URL + match(/data-original="([^"]+)/, show[i], 1);
            var newest = match(/data-newest='([^']+)/, show[i], 1);
            var rating = +match(/class='star'>[\S\s]+?value'>([0-9]+(?:\.[0-9]*)?)</, show[i], 1);
            var lastupdated = match(/data-lastupdated='([^']+)/, show[i], 1)
            var item = page.appendItem(PREFIX + ":page:" + url, "video", {
                title: new showtime.RichText(title /*+ ' | ' + trim(m[i][6])*/ ),
                description: new showtime.RichText(match(/class='title'>[\s\S]+?<\/div>([\s\S]+?)<\/div>/, show[i], 1)),
                icon: icon,
                rating: rating * 10
            });
            item.title = title;
            item.lastupdated = lastupdated;
            item.newest = newest;
            item.rating = rating;
            items.push(item);
            items_tmp.push(item);
        }
        try {
            for (i in items) {
                items[i].id = i;
            }
            items_tmp = page.getItems();
            for (i = 0; i < items_tmp.length; i++) {
                if (!items_tmp[i].id) delete items_tmp[i];
            }
            items_tmp.sort(SortBy({
                lastupdated: 0
            }));
            var order = (items_tmp);
            for (i in order) {
                items[order[i].id].moveBefore(i);
            }
            page.reorderer = function(item, before) {
                item.moveBefore(before);
                var items = page.getItems();
                for (var i = 0; i < items.length; i++) {
                    //    delete items[i].eventhandlers
                    if (!items[i].id) delete items[i];
                }
            };
        } catch (ex) {
            t("Error while parsing main menu order");
            e(ex);
        }
        page.type = "directory";
        page.contents = "items";
        page.loading = false;
    });
    plugin.addURI(PREFIX + ":page:(.*)", function(page, link) {
        page.type = "directory";
        var i, v, item;
        try {
            v = showtime.httpReq(BASE_URL + link, {
                debug: service.debug,
                headers: {
                    'Host': 'ororo.tv',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.2; WOW64; rv:25.0) Gecko/20100101 Firefox/25.0',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Referer': 'http://ororo.tv/' //,
                    //   'Cookie':this.id+'; '+this._ororo_session+'; '+this.remember_user_token
                }
            }).toString();
            p(v)
            var title = showtime.entityDecode(trim(match(/<img alt="(.+?)" id="poster"/, v, 1)));
            if (service.arrayview) {
                page.metadata.background = bg(title);
                page.metadata.backgroundAlpha = 0.5;
            }
            var year = parseInt(match(/<div id='year'[\S\s]+?([0-9]+(?:\.[0-9]*)?)/, v, 1), 10);
            var rating = parseInt(match(/<div id='rating'[\S\s]+?([0-9]+(?:\.[0-9]*)?)/, v, 1), 10) * 10;
            var duration = parseInt(match(/<div id='length'[\S\s]+?([0-9]+(?:\.[0-9]*)?)/, v, 1), 10);
            var genre = trim(match(/<div id='genres'>[\s\S]+?:<\/span>([\s\S]+?)</, v, 1));
            var icon = match(/id="poster" src="(.+?)"/, v, 1);
            page.metadata.logo = BASE_URL + icon;
            page.metadata.title = title + " (" + year + ")";
//            <a data-href="/en/shows/rizzoli-isles/videos/20812" data-id="20812" data-time="null" class="episode" href="#5-7">№7 Boston Keltic</a>

            //<a href="#1-3" class="episode" data-href="/shows/planet-earth/videos/2946" data-id="2946" data-time="null">№3 Fresh Water</a>
            
            var re = /<a href="#?([^-]+)-([^"]+)" [\S\s]+?data-href="([^"]+)[\S\s]+?>([^<]+)([\S\s]+?)<\/li/g;
            
            //var re = /data-href="([^"]+).+?data-id="(\d+).+?href="#(\d+)-(\d+).+?>([^<]+)/g
            var re = /data-href="([^"]+).+?data-id="(\d+).+?href="#(\d+)-(\d+).+?>([^<]+).[\s\S]+?<div class='plot'>([^<]+)/g
            var m = re.execAll(v);
            p(m)
            page.loading = false;
            if (m.toString()) {
                for (i = 0; i < m.length; i++) {
                    if (m[i][4] == '1') {
                        page.appendItem("", "separator", {
                            title: new showtime.RichText('Season ' + m[i][3])
                        });
                    }
                    item = page.appendItem(PREFIX + ":play:" + m[i][1] + ':' + escape(m[i][5] + '|' + title + '|' + parseInt(m[i][3], 10) + '|' + parseInt(m[i][4], 10)),
                        "video", {
                        title: new showtime.RichText(m[i][5]),
                        icon: BASE_URL + icon,
                        description: new showtime.RichText(m[i][6]),
                        rating: rating,
                        duration: duration,
                        genre: genre,
                        year: year
                    });
                    if (service.thetvdb) {
                        item.bindVideoMetadata({
                            title: trim(title),
                            season: parseInt(m[i][3], 10),
                            episode: parseInt(m[i][4], 10)
                        });
                    }
                }
            }
        } catch (ex) {
            page.error("Failed to process page");
            e(ex);
        }
        page.type = "directory";
        page.loading = false;
    });
    // Play links
    plugin.addURI(PREFIX + ":play:(.*):(.*)", function(page, url, title) {
        page.loading = true;
        page.metadata.logo = logo;
        var s = unescape(title).split('|');
        var videoparams = {
            no_fs_scan: true,
            title: unescape(s[1]),
            season: s[2],
            episode: s[3],
            canonicalUrl: PREFIX + ":play:" + url + ":" + title,
            sources: [{
                    url: []
                }
            ],
            subtitles: []
        };
        videoparams = get_video_link(url, videoparams);
        page.source = "videoparams:" + JSON.stringify(videoparams);
        page.loading = false;
        page.type = "video";
    });

    function get_video_link(url, videoparams) {
        try {
            var v = showtime.httpReq(BASE_URL + url, {
                debug: service.debug,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.2; WOW64; rv:25.0) Gecko/20100101 Firefox/25.0' //,
                    //    'Cookie': this.id+"; "+ this._ororo_session+'; '+remember_user_token+'; video=true;',
                    //   'Location':'http://static-ua.ororo.tv/uploads/video/file/15896/Almost.Human.S01E03.HDTV.x264-LOL.mp4'
                }
            }).toString();
            /**
<video autoplay class='video-js vjs-default-skin' controls data-id='424' data-number='1' data-season='1' data-setup='{}' data-show='Suits' data-title='Suits Season 1 Episode 1' data-type='Video' data-watched-total='0' id='my_video' nativecontrolsfortouch='false' poster='/uploads/show/poster/36/thumb_MV5BMTQ0ODY1Nzg0MF5BMl5BanBnXkFtZTcwODA4NDA4Nw__.jpg' preload='metadata'>
<source src='http://static-ca.ororo.tv/uploads/video/file/424/Suits_S01E01_-_Pilot.webm?video=true' type='video/webm'>
<source src='http://static-ca.ororo.tv/uploads/video/file/424/Suits_S01E01_-_Pilot.mp4?video=true' type='video/mp4'>
<track default kind='subtitles' label='en' src='/uploads/subtitle/file/5865/Suits_-_1x01_-_Pilot.720p.WEB-DL.en.srt' srclang='en'>
<track kind='subtitles' label='ru' src='/uploads/subtitle/file/28700/suits.s01e01.hdtv.xvid.srt' srclang='ru'>
</video>
*/
            var video_url = match(/<source src='\/(.*?)' type='video/, v, 1) ? BASE_URL + match(/<source src='\/(.*?)' type='video/, v, 1) : match(/<source src='(.*?)' type='video/, v, 1);
            videoparams.sources = [{
                    url: video_url.replace('.webm', service.Format)
            }];
            if (service.subs === true) {
                var re = /subtitles'.*?label='([^']+)+.*?src='([^']+)/g;
                var subtitles = re.exec(v);
                while (subtitles) {
                    p("Found subtitles:" + subtitles[1] + subtitles[2]);
                    videoparams.subtitles.push({
                        url: BASE_URL + subtitles[2],
                        language: subtitles[1],
                        title: subtitles[2].match(/file\/\d+\/([^']+)/)[1]
                    });
                    subtitles = re.exec(v);
                }
            }
        } catch (err) {
            e(err);
        }
        return videoparams;
    }

    function pageMenu(page) {
        if (service.arrayview) {
            page.metadata.background = plugin.path + "views/img/background.png";
            page.metadata.backgroundAlpha = 0.5;
        }
        //page.appendAction("pageevent", "sortDateDec", true, {
        //    title: "Sort by Date (Decrementing)",
        //    icon: plugin.path + "views/img/sort_date_dec.png"
        //});
        page.appendAction("pageevent", "sortViewsDec", true, {
            title: "Sort by Views (Decrementing)",
            icon: plugin.path + "views/img/sort_views_dec.png"
        });
        page.appendAction("pageevent", "sortAlphabeticallyInc", true, {
            title: "Sort Alphabetically (Incrementing)",
            icon: plugin.path + "views/img/sort_alpha_inc.png"
        });
        page.appendAction("pageevent", "sortAlphabeticallyDec", true, {
            title: "Sort Alphabetically (Decrementing)",
            icon: plugin.path + "views/img/sort_alpha_dec.png"
        });
        
//data-category="popularity"> Popularity
//data-category="lastupdated">Last updated
//data-category="newest">Last added
//data-category="imdb">By rating
//data-category="alphabetical">By name
//data-category="latest">By year

        var sorts = [
            ["sortDefault", "Default", true],
            ["sortAlphabeticallyInc", "Alphabetically (A->Z)"],
            ["sortViewsDec", "Views (decrementing)"],
            ["sortDateDec", "Published (decrementing)"],
            ["sortAlphabeticallyDec", "Alphabetically (Z->A)"]
        ];
        page.options.createMultiOpt("sort", "Sort by...", sorts, function(v) {
            eval(v + "()");
        });

        function sortAlphabeticallyInc() {
            var its = sort(items, {
                title: 1
            });
            pageUpdateItemsPositions(its);
        }

        function sortAlphabeticallyDec() {
            var its = sort(items, {
                title: 1
            });
            pageUpdateItemsPositions(its);
        }

        function sortViewsDec() {
            var its = sort(items, {
                rating: 0
            });
            pageUpdateItemsPositions(its);
        }

        function sortDateDec() {
            var its = sort(items, {
                newest: 0
            });
            pageUpdateItemsPositions(its);
        }

        function sortDefault() {
            for (var i in items_tmp) {
                items[i].moveBefore(items_tmp[i].orig_index);
            }
        }
        page.onEvent('sortAlphabeticallyInc', function() {
            sortAlphabeticallyInc();
        });
        page.onEvent('sortAlphabeticallyDec', function() {
            sortAlphabeticallyDec();
        });
        page.onEvent('sortViewsDec', function() {
            sortViewsDec();
        });
        page.onEvent('sortDateDec', function() {
            sortDateDec();
        });
        page.onEvent('sortDefault', function() {
            sortDefault();
        });
    }

    function pageUpdateItemsPositions(its) {
        for (var i in its) {
            items[its[i].orig_index].moveBefore(i);
        }
    }
    //function sort(items, field, reverse) {

    function sort(items, field) {
        if (items.length === 0) return null;
        var its = [];
        for (var i in items) {
            items[i].orig_index = i;
            its.push(items[i]);
        }
        its.sort(SortBy(field));
        return its;
    }
    //
    //extra functions
    //
    //*** This code is copyright 2004 by Gavin Kistner, !@phrogz.net
    //*** It is covered under the license viewable at http://phrogz.net/JS/_ReuseLicense.txt
    //*** Reuse or modification is free provided you abide by the terms of that license.
    //*** (Including the first two lines above in your source code mostly satisfies the conditions.)
    // Returns a function which can be used to sort an Array by multiple criteria.
    // Can be called in one of three ways:
    //   var sortFunc = SortBy( 'name' , 'age' , 'sex' );
    //   var sortFunc = SortBy( ['name','age','sex'] );
    //   var sortFunc = SortBy( { name:1, age:1, sex:1 } );
    //
    // The first two methods are equivalent, and sort in ascending order.
    // The last method allows you to specify sort direction:
    //   1 (or true)  specifies ascending sort order.
    //   0 (or false) specifies descending sort order.
    //
    // The sort function is constructed using 'dot notation' for the properties;
    // this means you can also specify a method to call on the object by putting
    // parentheses at the end of the name.
    // e.g. var stupidDateStringSort = SortBy('toDateString()','toTimeString()');

    function SortBy() {
        var a = arguments,
            len = a.length,
            f = 'return ',
            p = 1,
            i;
        if (len == 1 && (a[0].constructor == Object || a[0].constructor == Array) && ((o = a = a[0]).constructor == Object)) p = 0;
        if (p && (o = {}))
            for (i = 0, len = a.length; i < len; i++) o[a[i]] = 1;
        for (k in o) {
            var z = o[k] ? ['<', '>'] : ['>', '<'];
            f += 'a.' + k + z[0] + 'b.' + k + '?-1:a.' + k + z[1] + 'b.' + k + '?1:';
        }
        return new Function('a', 'b', f + '0');
    }
    // Add to RegExp prototype
    RegExp.prototype.execAll = function(string) {
        var matches = [];
        var match = null;
        while ((match = this.exec(string)) !== null) {
            var matchArray = [];
            for (var i in match) {
                if (parseInt(i, 10) == i) {
                    matchArray.push(match[i]);
                }
            }
            matches.push(matchArray);
        }
        return matches;
    };

    function bg(title) {
        title = trim(title);
        var v = showtime.httpGet('http://www.thetvdb.com/api/GetSeries.php', {
            'seriesname': title,
            'language': 'ru'
        }).toString();
        var id = match(/<seriesid>(.+?)<\/seriesid>/, v, 1);
        if (id) {
            v = (showtime.httpReq('http://www.thetvdb.com/api/0ADF8BA762FED295/series/' + id + '/banners.xml').toString());
            id = match(/<BannerPath>fanart\/original\/([^<]+)/, v, 1);
            return "http://thetvdb.com/banners/fanart/original/" + id;
        }
        return plugin.path + "views/img/background.png";
    }

    function getCookie(name, multiheaders) {
        var cookie = JSON.stringify(multiheaders['Set-Cookie']);
        p('cookie: ' + cookie);
        var matches = cookie.match(new RegExp('(?:^|; |","|")' + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
        return matches ? name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + '=' + decodeURIComponent(matches[1]) : false;
    }

    function match(re, st, i) {
        i = typeof i !== 'undefined' ? i : 0;
        if (re.exec(st)) {
            return re.exec(st)[i];
        } else return '';
    }

    function trim(s) {
        s = s.toString();
        s = s.replace(/(\r\n|\n|\r)/gm, "");
        s = s.replace(/(^\s*)|(\s*$)/gi, "");
        s = s.replace(/[ ]{2,}/gi, " ");
        return s;
    }

    function e(ex) {
        t(ex);
        t("Line #" + ex.lineNumber);
    }

    function t(message) {
        if (service.debug) showtime.trace(message, plugin.getDescriptor().id);
    }

    function p(message) {
        if (typeof(message) === 'object') message = JSON.stringify(message);
        if (service.debug) showtime.print(message);
    }

    function trace(msg) {
        if (service.debug) {
            t(msg);
            p(msg);
        }
    }
})(this);