// NOTE: Your browser must support Geolocation. You must also consent to
// location sharing when prompted by your browser.
// For Safari on MAC, make sure that location services are enabled in 
// System Preferences.

var map;
var geocoder;
var source;
var destn = "282 2nd Street 4th floor, San Francisco, CA 94105";

var directionsDisplay;
var directionsService;
var markerArray = [];

var transitMode;
var routeBoxer;
var distance;
var placesService;
var waypts = [];

// Wait till the document is loaded and then
// call the function initialize.
google.maps.event.addDomListener(window, 'load', initialize);


// Change the transit type according to the image
// which is clicked and recompute the route.
function change_transit_mode(selected, mode) {
    var types = document.getElementsByClassName('transit-type');
    for(var i=0; i<types.length; i++) {
        if(types[i] == selected) {
            types[i].style.backgroundColor = '#94DBFF';
        } else {
            types[i].style.backgroundColor = 'white';
        }
    }
    if(transitMode != mode.toUpperCase()) {
        transitMode = mode.toUpperCase();
        calcRoute();
    }
}


// Initialize
function initialize() {
  transitMode = "TRANSIT";
  document.getElementById('transit').style.backgroundColor = '#94DBFF';

  routeBoxer = new RouteBoxer();
  distance = 3; // km

  // Instantiate geocoder.
  geocoder = new google.maps.Geocoder();

  // Instantiate a directions service.
  directionsService = new google.maps.DirectionsService();

  // Create new map with specified mapOptions.
  var mapOptions = {
    zoom: 8
  };
  map = new google.maps.Map(document.getElementById('map-canvas'),
      mapOptions);

  // Create a renderer for directions and bind it to the map.
  var rendererOptions = {
    map: map,
  }
  directionsDisplay = new google.maps.DirectionsRenderer(rendererOptions);

  // Instantiate places service.
  placesService = new google.maps.places.PlacesService(map);

  // Get current location with HTML5 geolocation
  if(navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      source = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
      map.setCenter(source);
      calcRoute();
    }, function() {
      handleNoGeolocation(true);
    });
  } else {
    handleNoGeolocation(false);  // Browser doesn't support Geolocation
  }
}


// Handles Geolocation error
function handleNoGeolocation(errorFlag) {
  if (errorFlag) {
    var content = "Error:: The Geolocation service failed.";
  } else {
    var content = "Error:: Your browser doesn't support geolocation.";
  }

  var options = {
    map: map,
    position: new google.maps.LatLng(60, 105),
    content: content
  };

  var infowindow = new google.maps.InfoWindow(options);
  map.setCenter(options.position);
}


// Calculate the Route
function calcRoute() {
  // First, clear out any existing markers from previous calculations.
  for (i = 0; i < markerArray.length; i++) {
    markerArray[i].setMap(null);
  }

  // Create a DirectionsRequest using transitMode directions.
  // By default, transitMode is set to 'TRANSIT' (public transit).
  var route_request = {
      origin: source,
      destination: destn,
      travelMode: transitMode
  };

  // Since TRANSIT mode doesn't support waypoints, check the mode.
  if(transitMode != 'TRANSIT') {
    route_request.waypoints = waypts;
    route_request.optimizeWaypoints = true;
  }

  // Route the directions and pass the response to a
  // function to displace step-by-step instructions.
  directionsService.route(route_request, function(directionsResult, directionsStatus) {
    if (directionsStatus == google.maps.DirectionsStatus.OK) {
      // Show directions on Map.
      directionsDisplay.setDirections(directionsResult);
      directionsDisplay.setPanel(document.getElementById('directions-panel'));

      // Box the overview path of the route to obtain bounds
      // used for searching nearby places along the route.
      var path = directionsResult.routes[0].overview_path;
      var boxes = routeBoxer.box(path, distance);
      
      for (var i = 0; i < boxes.length; i++) {
        var search_bounds = boxes[i];
        // Perform search over these bounds 
        var places_request = {
            bounds: search_bounds,
            keyword: 'donuts & coffee',
            //openNow: true,
            types: ['store', 'cafe', 'restaurant', 'bakery', 'food']
        };
        placesService.nearbySearch(places_request, function(searchResults, searchStatus) {
            if (searchStatus == google.maps.places.PlacesServiceStatus.OK) {
                for (var i = 0; i < searchResults.length; i++) {
                  createMarker(searchResults[i]);   // Create a marker for each place.
                }
            }
        });
      }
    }
  });

}


// For each place, create a marker and add the place's name to the
// marker's info window.
function createMarker(place) {
  var placeLoc = place.geometry.location;
  var marker = new google.maps.Marker({
    map: map,
    position: place.geometry.location,
    icon: 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png'
  });
  markerArray.push(marker); // keep track of each marker to remove them
                            // when calculating new routes.

  add_infowindow(marker, place.name);   //add infowindow for the marker.

  // If the place is the chosen waypoint, change the color of marker to blue.
  if(waypts.length>0) {
    if(waypts[0].location.toString() == place.geometry.location.toString()) {
        marker.setIcon('http://maps.google.com/mapfiles/ms/icons/blue-dot.png');
    }
  }

  // If transit type is other than public transit, add a click event listener
  // to each marker. When the marker is cliked, the waypoint is reset to the
  // chosen place and the route is recalculated to include the waypoint also.
  if(transitMode != 'TRANSIT') {
    google.maps.event.addListener(marker, 'click', function() {
      waypts.length = 0;
          waypts.push({
              location:place.geometry.location,
              stopover:true
          });
          calcRoute();
    });
  }

}


// Show infowindow on mouseover. The infowindow disappears on mouseout.
function add_infowindow(marker, content) {
    var infowindow = new google.maps.InfoWindow();
    google.maps.event.addListener(marker, 'mouseover', function() {
      infowindow.setContent(content);
      infowindow.open(map, this);
    });
    google.maps.event.addListener(marker, 'mouseout', function() {
      infowindow.close();
    });
}
