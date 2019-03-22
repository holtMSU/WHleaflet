var LeafletLib = LeafletLib || {};
var LeafletLib = {

    latmin: 90,
    latmax: -90,
    lngmin: 180,
    lngmax: -180,

    searchRadius: 805,
    locationScope:      "Chicago",      //geographical area appended to all address searches
    recordName:         "outdoor pool",       //for showing number of results
    recordNamePlural:   "outdoor pools",
    markers: [ ],

    initialize: function(element, features, centroid, zoom) {

        LeafletLib.map = L.map(element).setView(new L.LatLng( centroid[0], centroid[1] ), zoom);

        LeafletLib.tiles = L.tileLayer('https://{s}.tiles.mapbox.com/v3/derekeder.hehblhbj/{z}/{x}/{y}.png', {
            attribution: '<a href="http://www.mapbox.com/about/maps/" target="_blank">Terms &amp; Feedback</a>'
        }).addTo(LeafletLib.map);

        LeafletLib.map.attributionControl.setPrefix('');
        L.Icon.Default.imagePath = "img";

        var poolIcon = L.icon({
          iconUrl: "img/swimming-indoor.png",
          iconSize: [ 32, 37 ],
          shadowUrl: "img/square-shadow.png",
          shadowSize: [ 40, 26 ],
          shadowAnchor: [ 10, 5 ],
          popupAnchor: [ 0, -10 ]
        });

        if(typeof features != "undefined"){
          for(var m=0;m<features.length;m++){
            var pt = new L.LatLng( features[m]['location']['latitude'], features[m]['location']['longitude'] );
            var url = "http://www.chicagoparkdistrict.com/parks/" + LeafletLib.convertToSlug(features[m]['park']) + "-park/";
            var popup = "<h4><a href='" + url + "'>" + features[m]['park'] + "</a></h4><p>" + features[m]['facility_type'] + "<br /><a href='" + url + "'>More info &raquo;</a></p>";
            new L.Marker( pt, { icon: poolIcon } ).addTo( LeafletLib.map ).bindPopup(popup);
            LeafletLib.addBoundedPoint( pt );
          }
        }
        if(typeof features.geojson != "undefined"){
          LeafletLib.geojson = L.geoJson(features.geojson, {
              style: LeafletLib.style
          }).addTo(LeafletLib.map);

          LeafletLib.addBoundedBox( LeafletLib.geojson.getBounds() );
        }

        LeafletLib.fitFeatures();

        // show results count
        var name = LeafletLib.recordNamePlural;
        if (features.length == 1)
          name = LeafletLib.recordName;

        $( "#result_count" ).fadeOut(function() {
            $( "#result_count" ).html(LeafletLib.addCommas(features.length) + " " + name + " found");
          });
        $( "#result_count" ).fadeIn();

    },

    style: function(feature) {
        return {
            weight: 2,
            opacity: 1,
            color: 'white',
            dashArray: '3',
            fillOpacity: 0.7,
            fillColor: '#FD8D3C'
        };
    },

    addBoundedPoint: function( latlng ){
        LeafletLib.latmin = Math.min( LeafletLib.latmin, latlng.lat );
        LeafletLib.latmax = Math.max( LeafletLib.latmax, latlng.lat );
        LeafletLib.lngmin = Math.min( LeafletLib.lngmin, latlng.lng );
        LeafletLib.lngmax = Math.max( LeafletLib.lngmax, latlng.lng );
    },

    addBoundedBox: function( bounds ){
        LeafletLib.latmin = Math.min( LeafletLib.latmin, bounds.getSouthWest().lat );
        LeafletLib.latmax = Math.max( LeafletLib.latmax, bounds.getNorthEast().lat );
        LeafletLib.lngmin = Math.min( LeafletLib.lngmin, bounds.getSouthWest().lng );
        LeafletLib.lngmax = Math.max( LeafletLib.lngmax, bounds.getNorthEast().lng );
    },

    fitFeatures: function(){
        if(LeafletLib.latmax > LeafletLib.latmin){
          var bounds = new L.LatLngBounds(
                      new L.LatLng( LeafletLib.latmin, LeafletLib.lngmin ),
                      new L.LatLng( LeafletLib.latmax, LeafletLib.lngmax ));

          LeafletLib.map.fitBounds( bounds.pad(.2) );
        }
    },

    squareAround: function(latlng, distance){
        var north = latlng.lat + distance * 0.000008;
        var south = latlng.lat - distance * 0.000008;
        var east = latlng.lng + distance * 0.000009;
        var west = latlng.lng - distance * 0.000009;
        var bounds = [[south, west], [north, east]];
        var sq = new L.rectangle(bounds);
        return sq;
    },

    searchFeature: function(){
      LeafletLib.searchRadius = $("#search_radius").val();

      var raw_address = $("#search_address").val().toLowerCase();
      raw_address = raw_address.replace(" n ", " north ");
      raw_address = raw_address.replace(" s ", " south ");
      raw_address = raw_address.replace(" e ", " east ");
      raw_address = raw_address.replace(" w ", " west ");

      LeafletLib.searchAddress( raw_address );
    },

    searchAddress: function(address){
        if(LeafletLib.locationScope && LeafletLib.locationScope.length){
          var checkaddress = address.toLowerCase();
          var checkcity = LeafletLib.locationScope.split(",")[0].toLowerCase();
          if(checkaddress.indexOf(checkcity) == -1){
            address += ", " + LeafletLib.locationScope;
          }
        }
        var s = document.createElement("script");
        s.type = "text/javascript";
        s.src = "http://nominatim.openstreetmap.org/search/" + encodeURIComponent(address) + "?format=json&json_callback=LeafletLib.returnAddress";
        document.body.appendChild(s);
    },

    drawSquare: function(foundLocation, searchRadius){
        LeafletLib.sq = LeafletLib.squareAround(foundLocation, searchRadius);
        LeafletLib.sq.setStyle({
          strokeColor: "#4b58a6",
          strokeOpacity: 0.3,
          strokeWeight: 1,
          fillColor: "#4b58a6",
          fillOpacity: 0.1
        });
        LeafletLib.map.addLayer(LeafletLib.sq);

        LeafletLib.centerMark = new L.Marker(foundLocation, { icon: (new L.Icon({
          iconUrl: 'img/blue-pushpin.png',
          iconSize: [32, 32],
          iconAnchor: [10, 32]
        }))}).addTo(LeafletLib.map);
    },

    returnAddress: function(response){
        //console.log(response);
        if(!response.length){
          alert("Sorry, no results found for that location.");
          return;
        }

        var first = response[0];
        var foundLocation = new L.LatLng(first.lat, first.lon);
        if(typeof LeafletLib.sq != "undefined" && LeafletLib.sq){
          LeafletLib.map.removeLayer(LeafletLib.sq);
          LeafletLib.map.removeLayer(LeafletLib.centerMark);
        }

        LeafletLib.drawSquare(foundLocation, LeafletLib.searchRadius);

        LeafletLib.filterMarkers( { rectangle: LeafletLib.sq } );

        LeafletLib.map.fitBounds( LeafletLib.sq.getBounds().pad(0.2) );
    },

    addMarker: function( marker ){
        LeafletLib.map.addLayer(marker);
        LeafletLib.addBoundedPoint( marker.getLatLng() );
        LeafletLib.markers.push( marker );
    },

    ptInShape: function( pt, shape ){
        if( typeof shape.rectangle != "undefined" ){
          var bounds = shape.rectangle.getBounds();
          if(pt.lat < bounds.getNorthEast().lat && pt.lat > bounds.getSouthWest().lat && pt.lng < bounds.getNorthEast().lng && pt.lng > bounds.getSouthWest().lng){
            return true;
          }
          return false;
        }
        else if( typeof shape.circle != "undefined" ){
          // getRadius is in meters, makes this more complex
        }
        else if( typeof shape.polygon != "undefined" ){
          var poly = shape.polygon.getLatLngs();
          for(var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i){
            ((poly[i].lat <= pt.lat && pt.lat < poly[j].lat) || (poly[j].lat <= pt.lat && pt.lat < poly[i].lat))
            && (pt.lng < (poly[j].lng - poly[i].lng) * (pt.lat - poly[i].lat) / (poly[j].lat - poly[i].lat) + poly[i].lng)
            && (c = !c);
          }
          return c;
       }
    },

    filterMarkers: function( boundary ){
        for(var m=0;m<LeafletLib.markers.length;m++){
          var ll = LeafletLib.markers[m].getLatLng();
          if(LeafletLib.ptInShape(ll, boundary)){
            if( !LeafletLib.map.hasLayer( LeafletLib.markers[m] ) ){
              LeafletLib.map.addLayer( LeafletLib.markers[m] );
            }
          }
          else{
            LeafletLib.map.removeLayer( LeafletLib.markers[m] );
          }
        }
    },

    geolocate: function(alt_callback){
        // Try W3C Geolocation
        var foundLocation;
        if(navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(function(position) {

            if(typeof alt_callback != "undefined"){
              alt_callback( position );
            }
            else{

              foundLocation = new L.LatLng(position.coords.latitude * 1.0, position.coords.longitude * 1.0);

              if(typeof LeafletLib.sq != "undefined" && LeafletLib.sq){
                LeafletLib.map.removeLayer(LeafletLib.sq);
                LeafletLib.map.removeLayer(LeafletLib.centerMark);
              }

              LeafletLib.drawSquare(foundLocation, LeafletLib.searchRadius);

              LeafletLib.filterMarkers( { rectangle: LeafletLib.sq } );

              LeafletLib.map.fitBounds( LeafletLib.sq.getBounds().pad(0.2) );
            }
          }, null);
        }
        else {
          alert("Sorry, we could not find your location.");
        }
    },
    addCommas: function(nStr) {
      nStr += '';
      x = nStr.split('.');
      x1 = x[0];
      x2 = x.length > 1 ? '.' + x[1] : '';
      var rgx = /(\d+)(\d{3})/;
      while (rgx.test(x1)) {
        x1 = x1.replace(rgx, '$1' + ',' + '$2');
      }
      return x1 + x2;
    },

    //converts a text in to a URL slug
    convertToSlug: function(text) {
      if (text == undefined) return '';
      text = text.substring(0, text.indexOf('(') -1);
      return (text+'').replace(/ /g,'-').replace(/[^\w-]+/g,'');
    },

}
