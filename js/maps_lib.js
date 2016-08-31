/google.maps.visualRefresh = true;

var MapsLib = MapsLib || {};
var MapsLib = {

  //Setup section - put your Fusion Table details here
  //Using the v1 Fusion Tables API. See https://developers.google.com/fusiontables/docs/v1/migration_guide for more info

  //the encrypted Table ID of your Fusion Table (found under File => About)
  //NOTE: numeric IDs will be deprecated soon
  fusionTableId:      "1BZkfBKRXVqoJi9SxYFWrHCyhzlMC_8dQ3SYZoirq", // Database

  polygon1TableID:    "12NKH0-cu-AwfpfEiD83u9aGJOXzYKveqkMF0HHwq", //communes
  polygon2TableID:    "1pigpdu2e4L1WADaoSblfMbKVH-UMLY7Ej9MtvIG9", //lines

  //*New Fusion Tables Requirement* API key. found at https://code.google.com/apis/console/
  //*Important* this key is for demonstration purposes. please register your own.
  googleApiKey:       "AIzaSyAujS5cr5sJzC4IJdGk4tO5YYqINOgX0eg",

  //name of the location column in your Fusion Table.
  //NOTE: if your location column name has spaces in it, surround it with single quotes
  //example: locationColumn:     "'my location'",
  locationColumn:     "col2",

  map_centroid:       new google.maps.LatLng(46.74169386912707, 1.6465245019530617), //center that your map defaults to
  locationScope:      "Indre, France",      //geographical area appended to all address searches
  recordName:         "result",       //for showing number of results
  recordNamePlural:   "results",


  searchRadius:       805,            //in meters ~ 1/2 mile
  defaultZoom:        12,             //zoom level when map is loaded (bigger is more zoomed in)
  addrMarkerImage:    'images/blue-pushpin.png', // set to empty '' to hide searched address marker
  currentPinpoint:    null,

  initialize: function() {
    $( "#result_count" ).html("");

    geocoder = new google.maps.Geocoder();
    var myOptions = {
      zoom: MapsLib.defaultZoom,
      center: MapsLib.map_centroid,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      styles: [
        {
          stylers: [
            { saturation: -100 }, // MODIFY Saturation and Lightness if needed
            { lightness: 40 }     // Current values make thematic polygon shading stand out over base map
          ]
        }
      ]
    };
    map = new google.maps.Map($("#map_canvas")[0],myOptions);

    // maintains map centerpoint for responsive design
    google.maps.event.addDomListener(map, 'idle', function() {
        MapsLib.calculateCenter();
    });

    google.maps.event.addDomListener(window, 'resize', function() {
        map.setCenter(MapsLib.map_centroid);
    });

    MapsLib.searchrecords = null;

    //MODIFY to match 3-bucket GFT values of pre-checked polygon1  - see also further below
    MapsLib.setDemographicsLabels("$25&ndash;50k", "$50&ndash;100k", "$100&ndash;215k");

    // MODIFY if needed: defines background polygon1 and polygon2 layers
    MapsLib.polygon1 = new google.maps.FusionTablesLayer({
      query: {
        from:   MapsLib.polygon1TableID,
        select: "col8"
      },
      styleId: 2,
      templateId: 2
    });

    MapsLib.polygon2 = new google.maps.FusionTablesLayer({
      query: {
        from:   MapsLib.polygon2TableID,
        select: "col4"
      },
      styleId: 2,
      templateId: 2
    });
    
        //reset filters
        $("#search_address").val(self.convertToPlainString($.address.parameter('address')));
        var loadRadius = self.convertToPlainString($.address.parameter('radius'));
        if (loadRadius != "") 
            $("#search_radius").val(loadRadius);
        else 
            $("#search_radius").val(self.searchRadius);
        
        $(":checkbox").prop("checked", "checked");
        $("#result_box").hide();

        //-----custom initializers-----
        $("#Km-slider").slider({
    orientation: "horizontal",
    range: true,
    min: 0,
    max: 60,
    values: [0, 60],
    step: 5,
    slide: function (event, ui) {
        $("#Km-selected-start").html(ui.values[0]);
        $("#Km-selected-end").html(ui.values[1]);
    },
    stop: function(event, ui) {
      self.doSearch();
    }
});
        //-----end of custom initializers-----

        //run the default search when page loads
        self.doSearch();
        if (options.callback) options.callback(self);
    };

    //-----custom functions-----
    //-----end of custom functions-----

    MapsLib.prototype.submitSearch = function (whereClause, map) {
        var self = this;
        //get using all filters
        //NOTE: styleId and templateId are recently added attributes to load custom marker styles and info windows
        //you can find your Ids inside the link generated by the 'Publish' option in Fusion Tables
        //for more details, see https://developers.google.com/fusiontables/docs/v1/using#WorkingStyles
        self.searchrecords = new google.maps.FusionTablesLayer({
            query: {
                from: self.fusionTableId,
                select: self.locationColumn,
                where: whereClause
            },
            styleId: 2,
            templateId: 2
        });
        self.fusionTable = self.searchrecords;
        self.searchrecords.setMap(map);
        self.getCount(whereClause);
    };


    MapsLib.prototype.getgeoCondition = function (address, callback) {
        var self = this;
        if (address !== "") {
            if (address.toLowerCase().indexOf(self.locationScope) === -1) {
                address = address + " " + self.locationScope;
            }
            self.geocoder.geocode({
                'address': address
            }, function (results, status) {
                if (status === google.maps.GeocoderStatus.OK) {
                    self.currentPinpoint = results[0].geometry.location;
                    var map = self.map;

                    $.address.parameter('address', encodeURIComponent(address));
                    $.address.parameter('radius', encodeURIComponent(self.searchRadius));
                    map.setCenter(self.currentPinpoint);
                    // set zoom level based on search radius
                    if (self.searchRadius >= 1610000) map.setZoom(4); // 1,000 miles
                    else if (self.searchRadius >= 805000) map.setZoom(5); // 500 miles
                    else if (self.searchRadius >= 402500) map.setZoom(6); // 250 miles
                    else if (self.searchRadius >= 161000) map.setZoom(7); // 100 miles
                    else if (self.searchRadius >= 80500) map.setZoom(8); // 100 miles
                    else if (self.searchRadius >= 40250) map.setZoom(9); // 100 miles
                    else if (self.searchRadius >= 16100) map.setZoom(11); // 10 miles
                    else if (self.searchRadius >= 8050) map.setZoom(12); // 5 miles
                    else if (self.searchRadius >= 3220) map.setZoom(13); // 2 miles
                    else if (self.searchRadius >= 1610) map.setZoom(14); // 1 mile
                    else if (self.searchRadius >= 805) map.setZoom(15); // 1/2 mile
                    else if (self.searchRadius >= 400) map.setZoom(16); // 1/4 mile
                    else self.map.setZoom(17);

                    if (self.addrMarkerImage != '') {
                        self.addrMarker = new google.maps.Marker({
                            position: self.currentPinpoint,
                            map: self.map,
                            icon: self.addrMarkerImage,
                            animation: google.maps.Animation.DROP,
                            title: address
                        });
                    }
                    var geoCondition = " AND ST_INTERSECTS(" + self.locationColumn + ", CIRCLE(LATLNG" + self.currentPinpoint.toString() + "," + self.searchRadius + "))";
                    callback(geoCondition);
                    self.drawSearchRadiusCircle(self.currentPinpoint);
                } else {
                    alert("We could not find your address: " + status);
                    callback('');
                }
            });
        } else {
            callback('');
        }
    };

    MapsLib.prototype.doSearch = function () {
        var self = this;
        self.clearSearch();
        var address = $("#search_address").val();
        self.searchRadius = $("#search_radius").val();
        self.whereClause = self.locationColumn + " not equal to ''";
        
        //-----custom filters-----
        var type_column = "'Type'";
var searchType = type_column + " IN (-1,";
if ( $("#cbType1").is(':checked')) searchType += "1,";
if ( $("#cbType2").is(':checked')) searchType += "2,";
if ( $("#cbType3").is(':checked')) searchType += "3,";
if ( $("#cbType4").is(':checked')) searchType += "4,";
if ( $("#cbType5").is(':checked')) searchType += "5,";
if ( $("#cbType6").is(':checked')) searchType += "6,";
if ( $("#cbType7").is(':checked')) searchType += "7,";
self.whereClause += " AND " + searchType.slice(0, searchType.length - 1) + ")";

self.whereClause += " AND 'Km' >= '" + $("#Km-selected-start").html() + "'";
self.whereClause += " AND 'Km' <= '" + $("#Km-selected-end").html() + "'";

        //-----end of custom filters-----

        self.getgeoCondition(address, function (geoCondition) {
            self.whereClause += geoCondition;
            self.submitSearch(self.whereClause, self.map);
        });

    };

    MapsLib.prototype.reset = function () {
        $.address.parameter('address','');
        $.address.parameter('radius','');
        window.location.reload();
    };


    MapsLib.prototype.getInfo = function (callback) {
        var self = this;
        jQuery.ajax({
            url: 'https://www.googleapis.com/fusiontables/v1/tables/' + self.fusionTableId + '?key=' + self.googleApiKey,
            dataType: 'json'
        }).done(function (response) {
            if (callback) callback(response);
        });
    };

    MapsLib.prototype.addrFromLatLng = function (latLngPoint) {
        var self = this;
        self.geocoder.geocode({
            'latLng': latLngPoint
        }, function (results, status) {
            if (status === google.maps.GeocoderStatus.OK) {
                if (results[1]) {
                    $('#search_address').val(results[1].formatted_address);
                    $('.hint').focus();
                    self.doSearch();
                }
            } else {
                alert("Geocoder failed due to: " + status);
            }
        });
    };

    MapsLib.prototype.drawSearchRadiusCircle = function (point) {
        var self = this;
        var circleOptions = {
            strokeColor: "#4b58a6",
            strokeOpacity: 0.3,
            strokeWeight: 1,
            fillColor: "#4b58a6",
            fillOpacity: 0.05,
            map: self.map,
            center: point,
            clickable: false,
            zIndex: -1,
            radius: parseInt(self.searchRadius)
        };
        self.searchRadiusCircle = new google.maps.Circle(circleOptions);
    };

    MapsLib.prototype.query = function (query_opts, callback) {
        var queryStr = [],
            self = this;
        queryStr.push("SELECT " + query_opts.select);
        queryStr.push(" FROM " + self.fusionTableId);
        // where, group and order clauses are optional
        if (query_opts.where && query_opts.where != "") {
            queryStr.push(" WHERE " + query_opts.where);
        }
        if (query_opts.groupBy && query_opts.groupBy != "") {
            queryStr.push(" GROUP BY " + query_opts.groupBy);
        }
        if (query_opts.orderBy && query_opts.orderBy != "") {
            queryStr.push(" ORDER BY " + query_opts.orderBy);
        }
        if (query_opts.offset && query_opts.offset !== "") {
            queryStr.push(" OFFSET " + query_opts.offset);
        }
        if (query_opts.limit && query_opts.limit !== "") {
            queryStr.push(" LIMIT " + query_opts.limit);
        }
        var theurl = {
            base: "https://www.googleapis.com/fusiontables/v1/query?sql=",
            queryStr: queryStr,
            key: self.googleApiKey
        };
        $.ajax({
            url: [theurl.base, encodeURIComponent(theurl.queryStr.join(" ")), "&key=", theurl.key].join(''),
            dataType: "json"
        }).done(function (response) {
            //console.log(response);
            if (callback) callback(response);
        }).fail(function(response) {
            self.handleError(response);
        });
    };

    MapsLib.prototype.handleError = function (json) {
        if (json.error !== undefined) {
            var error = json.responseJSON.error.errors;
            console.log("Error in Fusion Table call!");
            for (var row in error) {
                console.log(" Domain: " + error[row].domain);
                console.log(" Reason: " + error[row].reason);
                console.log(" Message: " + error[row].message);
            }
        }
    };
    MapsLib.prototype.getCount = function (whereClause) {
        var self = this;
        var selectColumns = "Count()";
        self.query({
            select: selectColumns,
            where: whereClause
        }, function (json) {
            self.displaySearchCount(json);
        });
    };

    MapsLib.prototype.displaySearchCount = function (json) {
        var self = this;
        
        var numRows = 0;
        if (json["rows"] != null) {
            numRows = json["rows"][0];
        }
        var name = self.recordNamePlural;
        if (numRows == 1) {
            name = self.recordName;
        }
        $("#result_box").fadeOut(function () {
            $("#result_count").html(self.addCommas(numRows) + " " + name + " found");
        });
        $("#result_box").fadeIn();
    };

    MapsLib.prototype.addCommas = function (nStr) {
        nStr += '';
        x = nStr.split('.');
        x1 = x[0];
        x2 = x.length > 1 ? '.' + x[1] : '';
        var rgx = /(\d+)(\d{3})/;
        while (rgx.test(x1)) {
            x1 = x1.replace(rgx, '$1' + ',' + '$2');
        }
        return x1 + x2;
    };

    // maintains map centerpoint for responsive design
    MapsLib.prototype.calculateCenter = function () {
        var self = this;
        center = self.map.getCenter();
    };

    //converts a slug or query string in to readable text
    MapsLib.prototype.convertToPlainString = function (text) {
        if (text === undefined) return '';
        return decodeURIComponent(text);
    };

    MapsLib.prototype.clearSearch = function () {
        var self = this;
        if (self.searchrecords && self.searchrecords.getMap) 
            self.searchrecords.setMap(null);
        if (self.addrMarker && self.addrMarker.getMap) 
            self.addrMarker.setMap(null);
        if (self.searchRadiusCircle && self.searchRadiusCircle.getMap) 
            self.searchRadiusCircle.setMap(null);
    };

    MapsLib.prototype.findMe = function () {
        var self = this;
        var foundLocation;
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (position) {
                var latitude = position.coords.latitude;
                var longitude = position.coords.longitude;
                var accuracy = position.coords.accuracy;
                var coords = new google.maps.LatLng(latitude, longitude);
                self.map.panTo(coords);
                self.addrFromLatLng(coords);
                self.map.setZoom(14);
                jQuery('#map_canvas').append('<div id="myposition"><i class="fontello-target"></i></div>');
                setTimeout(function () {
                    jQuery('#myposition').remove();
                }, 3000);
            }, function error(msg) {
                alert('Please enable your GPS position future.');
            }, {
                //maximumAge: 600000,
                //timeout: 5000,
                enableHighAccuracy: true
            });
        } else {
            alert("Geolocation API is not supported in your browser.");
        }
    };
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = MapsLib;
    } else if (typeof define === 'function' && define.amd) {
        define(function () {
            return MapsLib;
        });
    } else {
        window.MapsLib = MapsLib;
    }

})(window);
