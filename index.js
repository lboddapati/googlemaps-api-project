// NOTE: Your browser must support Geolocation. You must also consent to
// location sharing when prompted by your browser.
// For Safari on MAC, make sure that location services are enabled in 
// System Preferences.

var map;
var geocoder;
var sourceAddr="";
var destinationAddr = "282 2nd Street 4th floor, San Francisco, CA 94105";

var directionsDisplay;
var directionsService;
var markerArray = [];

var sourcePos;
var destinationPos;

var transitMode = "TRANSIT";

var routeBoxer;
var distance;
var placesService;
var waypts = [];

// Wait till the document is loaded and then
// call the function initialize.
google.maps.event.addDomListener(window, 'load', initialize);


// Change the transit type according to the image
// which is clicked and recompute the route.
function change_transit_mode(mode) {
    if(transitMode != mode.toUpperCase()) {
        transitMode = mode.toUpperCase();
        calcRoute();
    }
}


// Initialize
function initialize() {
  document.getElementById("end").innerHTML = destinationAddr;

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
      var pos = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
      map.setCenter(pos);
      reverseGeoCodeSourceLatLng(pos);  // Get the Address of current location
                                        // using Reverse Geocoding.
    }, function() {
      handleNoGeolocation(true);
    });
  } else {
    handleNoGeolocation(false);  // Browser doesn't support Geolocation
  }

  //geoCodeDestAddress(destinationAddr);
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


/*function geoCodeDestAddress(address) {
    geocoder.geocode( { 'address': address}, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        destinationPos=results[0].geometry.location;
      } else {
        alert("Geocode was not successful for the following reason: " + status);
      }
    });
}*/

// Reverse geocoding to get the address of user's current location.
function reverseGeoCodeSourceLatLng(latlng) {
    geocoder.geocode({'latLng': latlng}, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        sourcePos=latlng;
        sourceAddr=results[1].formatted_address;
        document.getElementById("start").innerHTML = sourceAddr;
        calcRoute();
      } else {
        alert("Geocoder failed :: " + status);
      }
    });
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
      origin: sourcePos,
      destination: destinationAddr,
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
      // Show Warnings
      var warnings = document.getElementById("warnings_panel");
      warnings.innerHTML = "" + directionsResult.routes[0].warnings + "";

      // Show directions on Map.
      directionsDisplay.setDirections(directionsResult);

      // First clear previous steps.
      document.getElementById("steps").innerHTML = "";

      // Show total fare of public transport.
      if(transitMode == 'TRANSIT') {
        var fare = directionsResult.routes[0].fare;
        document.getElementById("steps").innerHTML += "Total Fare: "+fare.value+" "+fare.currency+"<br>";
      }

      // Show total travel time.
      var totalSeconds = 0;
      for(var i=0; i<directionsResult.routes[0].legs.length; i++) {
        totalSeconds += directionsResult.routes[0].legs[i].duration.value;
      }
      var hours = Math.floor(totalSeconds / 3600);
      totalSeconds %= 3600;
      var minutes = Math.ceil(totalSeconds / 60);
      var totalTravelTime = hours+" hrs "+minutes+" mins";
      document.getElementById("steps").innerHTML += "Total Travel Time: "+totalTravelTime+"<br>";            

      // Show step-by-step instructions
      showSteps(directionsResult);

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


// Display all the direction steps for each leg of the commute.
// For direct route (as in case of public transit), there will be only 1 leg.
// For walking and bicycling, there can be 1 or 2 legs (2 legs when user chooses
// a waypoint from the given places options.
function showSteps(directionResult) {
  for(var i=0; i<directionResult.routes[0].legs.length; i++) {
    var myRoute = directionResult.routes[0].legs[i];
    document.getElementById("steps").innerHTML += "From: "+myRoute.start_address+"<br>";
    document.getElementById("steps").innerHTML += "To: "+myRoute.end_address;//+"<br>";
    displayInstructionSteps(myRoute.steps);
  }
}


// Display the instructions for given leg.
function displayInstructionSteps(steps) {
    var instructionSteps = "<br><ol>";
    for(var i=0; i<steps.length; i++) {
        instructionSteps += "<li>"+ steps[i].instructions +"</li>";
    }
    instructionSteps += "</ol>";
    document.getElementById("steps").innerHTML += instructionSteps;
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


