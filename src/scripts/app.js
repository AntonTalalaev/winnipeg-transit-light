// 1) to search places by word 'burger'
// GET	https://api.mapbox.com/geocoding/v5/mapbox.places/burger.json?access_token=pk.eyJ1Ijoiam9obmF0aGFubml6aW9sIiwiYSI6ImNqcG5oZjR0cDAzMnEzeHBrZGUyYmF2aGcifQ.7vAuGZ0z6CY0kXYDkcaOBg&limit=10&bbox=-97.325875,49.766204,-96.953987,49.99275
// Returns:
// JSON.features[0].place_name = 'Nuburger, 472 Stradbrook Ave., Winnipeg, Manitoba R3L 1Y7, Canada';
// JSON.features[0].centre = [ -97.14541, 49.877398 ];

// 2) to plan the route: Novavista Drive (data-long="-97.0987949" data-lat="49.8234854") to Osborne Street (data-long="-97.1381831" data-lat="49.870168")
// GET https://api.winnipegtransit.com/v3/trip-planner.json?origin=geo/49.8234854,-97.0987949&api-key=ZPFv2Zx6ny1KrlPKnfe&destination=geo/49.870168,-97.1381831
// geo/{lat},{lon}
// Returns:
// [0] Walk for 2 minutes to stop #40195 - Westbound Regent at Stapon
// [1] Ride the Route 75 Crosstown East for 23 minutes.
// [2] Transfer from stop #50404 - Westbound Bishop Grandin at Dakota to stop #50486 - Northbound Dakota at Bishop Grandin
// [3] Ride the Route 16 Selkirk-Osborne for 12 minutes.
// [4] Walk for 2 minutes to your destination.
// JSON.plans[0].segments[0].type = 'walk';
// JSON.plans[0].segments[0].times.durations.total = 2;
// JSON.plans[0].segments[0].to.stop.key = 40195;
// JSON.plans[0].segments[0].to.stop.name = 'Westbound Regent at Stapon';
// JSON.plans[0].segments[1].type = 'ride';
// JSON.plans[0].segments[1].times.durations.total = 23;
// JSON.plans[0].segments[1].route.name = Route 75 Crosstown East;
// JSON.plans[0].segments[2].type = 'transfer';
// JSON.plans[0].segments[2].times.durations.total = 5;
// JSON.plans[0].segments[2].from.stop.key = 50404;
// JSON.plans[0].segments[2].from.stop.name = Westbound Bishop Grandin at Dakota;
// JSON.plans[0].segments[2].to.stop.key = '50486';
// JSON.plans[0].segments[2].to.stop.name = 'Northbound Dakota at Bishop Grandin';
// JSON.plans[0].segments[3].type = 'ride';
// JSON.plans[0].segments[3].times.durations.total = 12;
// JSON.plans[0].segments[3].route.name = Route 16 Selkirk-Osborne;
// JSON.plans[0].segments[4].type = 'walk';
// JSON.plans[0].segments[4].times.durations.total = 2;
// JSON.plans[0].segments[4].to.destination = not undefined;

const mapboxKey = 'pk.eyJ1IjoiYW50b250YWxhbGFldiIsImEiOiJja2pwODhheXowdXJlMnJxbDcyY3FtcGcyIn0.EaOqmEvF_DnjGnlxnMlbVw';
const transitKey = 'J9BnB98MwTTTmVYDGXke';

const mapboxURLBase = `https://api.mapbox.com/geocoding/v5/mapbox.places/`;
const mapboxURLArgs = `.json?access_token=${mapboxKey}&limit=10&bbox=-97.325875,49.766204,-96.953987,49.99275`;

const tripPlannerURL = `https://api.winnipegtransit.com/v3/trip-planner.json?api-key=${transitKey}`;

// Coefficient for choosing best trip
const timePrecision = 0.15;

const originInput = document.querySelector('.origin-form input');
const destinationInput = document.querySelector('.destination-form input');

const originsListElemet = document.querySelector('.origins');
const destinationsListElemet = document.querySelector('.destinations');

const planTripElement = document.querySelector('.plan-trip');
const busContainerElement = document.querySelector('.bus-container');

const filtersContainerElement = document.querySelector('.filters-container');
const bestTripButton = document.querySelector('.best-trip');
const allTripsButton = document.querySelector('.all-trips');
const minTimeTripButton = document.querySelector('.min-time-trip');
const minTransferTripButton = document.querySelector('.min-transfer-trip');
const minWalkTripButton = document.querySelector('.min-walk-trip');

/**
 * Method to make API calls and return JSON
 * @param {string} url - URL string for API call
 */
function fetchJSON(url) {
  return fetch(url)
    .then(resp => {
      if (resp.ok) {
        return resp.json();
      } else if (resp.status !== 404) {
        throw new Error(`Status - #${resp.status}; status message - ${resp.statusText}.`);
      }
    })
};

/**
 * Method to display on the page found places
 * @param {JSON} places - places that were found based on search
 * @param {DOM element} listElemet - container were to show found places
 */
const displayPlacesElements = function (places, listElemet) {
  places.forEach(place => {
    let long = place.center[0];
    let lat = place.center[1];
    let nameArr = place.place_name.split(", ", 2);
    let name = nameArr[0];
    let address = nameArr[1];

    listElemet.insertAdjacentHTML('beforeend',
      `<li data-long="${long}" data-lat="${lat}" >
                <div class="name">${name}</div>
                <div>${address}</div>
            </li>`
    );
  });
}

/**
 * Method to display 'Places not found' error message
 */
const displayNoPlacesFoundMessage = function (listElemet) {
  console.log('Error: places not found');
  listElemet.insertAdjacentHTML('beforeend',
    `<li style="background-color:#f2f3ff;">
        <div style="margin-bottom:5px;">We are very sorry, but based on your search, 
        no places were found in Winnipeg.</div>
        <div>Please try to change the query string.</div>
    </li>`
  );
};

/**
 * Method to display 'Server error' error message
 */
const displayCustomErrorMessage = function (message) {
  busContainerElement.innerHTML =
    `<div style="border:#c91717 1px solid; color:#b03647; padding:10px;">
        <p>We are sorry, but an error was emitted.</p>
        <p>Type of error: ${message}.</p>
        <p>Please, try again.</p>
    </div>`;
};

/**
 * Method to call API to get places and display found places on the page
 * @param {string} url - url for API call (Mapbox)
 * @param {DOM element} listElemet - container were to show found places
 */
const showPlaces = function (url, listElemet) {
  fetchJSON(url)
    .then(json => {
      if (json === undefined
        || json.features === undefined) {
        throw new Error('Server error');
      } else if (json.features.length === 0) {
        displayNoPlacesFoundMessage(listElemet);
      } else {
        displayPlacesElements(json.features, listElemet);
      }
    })
    .catch(err => {
      displayCustomErrorMessage('Server error');
      console.log(err);
    });
};

/**
 * Method to validate user input
 * @param {string} input - users input for search places
 */
const validateInput = function (input) {
  format = /[!@#$%^&*()_+\=\[\]{};\\|<>\/?]+/;
  if (input === undefined || input === null || input === "") {
    return false;
  } else if (format.test(input)) {
    displayCustomErrorMessage('Invalid input - special characters were used');
    console.log('Error: special characters used in input');
    return false;
  }
  return true;
};

/**
 * Method to clean all HTML inside the element
 * @param {DOM element} elemet - DOM element
 */
const clearElementHTML = function (elemet) {
  elemet.innerHTML = '';
};

/**
 * Method to search places based on users input
 * @param {DOM element} inputElement - input DOM element 
 * @param {DOM element} listElemet - container were to show found places
 */
const searchPoints = function (inputElement, listElemet) {
  clearElementHTML(listElemet);
  if (validateInput(inputElement.value)) {
    const url = mapboxURLBase + inputElement.value + mapboxURLArgs;
    showPlaces(url, listElemet);
  }
};

/**
 * EventListener to search origin point
 */
originInput.addEventListener('keyup', function (event) {
  if (event.keyCode === 13) {
    searchPoints(originInput, originsListElemet);
  }
});

/**
 * EventListener to search destination point
 */
destinationInput.addEventListener('keyup', function (event) {
  if (event.keyCode === 13) {
    searchPoints(destinationInput, destinationsListElemet);
  }
});

/**
 * Method to highlight selected place element
 * @param {DOM element} element - place element
 * @param {DOM element} listElemet - container with found places
 */
const selectPlace = function (element, listElemet) {
  if (element.tagName.toLowerCase() === 'li'
    || element.tagName.toLowerCase() === 'div') {

    if (element.tagName.toLowerCase() === 'div') {
      element = element.parentElement;
    }

    if (!element.classList.contains('selected')) {
      const prevSelectedElement = listElemet.querySelector('.selected');

      if (prevSelectedElement !== null) {
        prevSelectedElement.classList.remove('selected');
      }
      element.classList.add('selected');
    }
  }
};

/**
 * EventListener to select origin point (place)
 */
originsListElemet.addEventListener('click', function (event) {
  selectPlace(event.target, originsListElemet);
});

/**
 * EventListener to select destination point (place)
 */
destinationsListElemet.addEventListener('click', function (event) {
  selectPlace(event.target, destinationsListElemet);
});

/**
 * Method to display 'No Routes Found' error message
 */
const displayCustomMessage = function (message) {
  busContainerElement.innerHTML =
    `<div style="padding:10px;">
        <p>${message}</p>
        <p>Please, try again.</p>
    </div>`;
};

/**
 * Method to generate Walk Segment of the trip
 * @param {JSON} segment - JSON object that represents part(segment) of the trip
 */
const getWalkSegment = function (segment) {
  const duration = segment.times.durations.total = 2;
  let destStr = '';
  if (segment.to.stop !== undefined) {
    destStr = `stop #${segment.to.stop.key} - ${segment.to.stop.name}`;
  } else if (segment.to.destination !== undefined) {
    destStr = `your destination`;
  }

  return `<li>
            <i class="fas fa-walking" aria-hidden="true"></i>Walk for ${duration} 
            minutes to ${destStr}.
          </li>`;
};

/**
 * Method to generate Ride Segment of the trip
 * @param {JSON} segment - JSON object that represents part(segment) of the trip
 */
const getRideSegment = function (segment) {
  const duration = segment.times.durations.total;
  const routeName = segment.route.name;

  return `<li>
            <i class="fas fa-bus" aria-hidden="true"></i>Ride the ${routeName} 
            for ${duration} minutes.
          </li>`;
};

/**
 * Method to generate Transfer Segment of the trip
 * @param {JSON} segment - JSON object that represents part(segment) of the trip
 */
const getTransferSegment = function (segment) {
  const fromStop = segment.from.stop;
  const toStop = segment.to.stop;

  return `<li>
            <i class="fas fa-ticket-alt" aria-hidden="true"></i>Transfer from stop
            #${fromStop.key} - ${fromStop.name} to stop #${toStop.key} - ${toStop.name}.
          </li>`;
};

/**
 * Method to generate the trip element HTML
 * @param {JSON} route - JSON object that represents the trip(route)
 */
const createRouteHTML = function (route) {
  let routeHTML = `<ul class="my-trip hide" 
            data-durationTotal="${route.times.durations.total}" 
            data-durationWalking="${route.times.durations.walking}"  
            data-numOfSegments="${route.segments.length}"
        >`;

  route.segments.forEach(segment => {
    if (segment.type === 'walk') {
      routeHTML += getWalkSegment(segment);
    } else if (segment.type === 'ride') {
      routeHTML += getRideSegment(segment);
    } else if (segment.type === 'transfer') {
      routeHTML += getTransferSegment(segment);
    }
  });

  routeHTML += '</ul>';

  return routeHTML;
};

/**
 * Method to insert route(trip) elements HTML into the container
 * @param {[JSON]} routes - array of JSON objects that represents found trips(routes)
 */
const insertRouteElements = function (routes) {
  routes.forEach(route => {
    busContainerElement.insertAdjacentHTML('beforeend', createRouteHTML(route));
  });
};

/**
 * Method to choose and mark the recommended route(trip)
 */
const setRecommendedRoute = function () {
  const myTripElements = busContainerElement.querySelectorAll('.my-trip');
  let minDuration = Number.MAX_SAFE_INTEGER;
  let bestTrip;

  myTripElements.forEach(trip => {
    if (minDuration > trip.dataset.durationtotal) {
      minDuration = trip.dataset.durationtotal;
    }
  });

  const duration = minDuration + minDuration * timePrecision;
  let minTransfer = Number.MAX_SAFE_INTEGER;

  myTripElements.forEach(trip => {
    if (trip.dataset.durationtotal <= duration) {
      if (trip.dataset.durationtotal === minDuration) {
        bestTrip = trip;
      }
      if (minTransfer > trip.dataset.numofsegments) {
        minTransfer = trip.dataset.numofsegments;
      }
    }
  });

  myTripElements.forEach(trip => {
    if (trip.dataset.durationtotal <= duration) {
      if (trip.dataset.numofsegments === minTransfer) {
        bestTrip = trip;
      }
    }
  });

  bestTrip.classList.add('recommended');
  bestTrip.classList.remove('hide');
};

/**
 * Method to call API to get routes(trips) and display results on the page
 * @param {string} url - url for API call (Winnipeg Transit)
 */
const showRoute = function (url) {
  fetchJSON(url)
    .then(json => {
      if (json === undefined
        || json.plans === undefined
        || json.plans.length === 0) {
        displayCustomMessage('No available rotes found.');
      } else {
        insertRouteElements(json.plans);
        setRecommendedRoute();
        showFilterButtons();
      }
    })
    .catch(err => {
      displayCustomErrorMessage('Server error');
      console.log(err);
    });
};

/**
 * Method to generate location string of the place for API call (Winnipeg Transit)
 * @param {DOM element} place - DOM element that represents place(point)
 */
const getLocationStr = function (place) {
  const placeLat = place.dataset.lat;
  const placeLon = place.dataset.long;

  return `geo/${placeLat},${placeLon}`;
};

/**
 * Method to generate string for TripPlanner API call (Winnipeg Transit)
 */
const getTripPlannerURL = function () {
  const originLocationStr = getLocationStr(originsListElemet.querySelector('.selected'));
  const destinationLocationStr =
    getLocationStr(destinationsListElemet.querySelector('.selected'));
  const url =
    `${tripPlannerURL}&origin=${originLocationStr}&destination=${destinationLocationStr}`;

  return url;
};

/**
 * Method to validate Selected Places 
 */
const validateSelectedPlaces = function () {
  const originPlace = originsListElemet.querySelector('.selected');
  const destinationPlace = destinationsListElemet.querySelector('.selected');

  if (originPlace === null || destinationPlace === null) {
    displayCustomMessage('Both origin and destination points should be selected.');
    return false;
  }

  if (originPlace.dataset.long === destinationPlace.dataset.long
    && originPlace.dataset.lat === destinationPlace.dataset.lat) {
    displayCustomMessage('Different starting and destination locations need to be chosen.');
    return false;
  }

  return true;
};

/**
 * Event Listener for Plan My Trip button
 */
planTripElement.addEventListener('click', function () {
  // If there isn't at least 1 starting location and 1 destination selected, clicking the plan my trip button should display an appropriate message to the user. 
  // If locations are the same - message that you choose the same start and finish points
  hideFilterButtons();
  if (validateSelectedPlaces()) {
    const url = getTripPlannerURL();
    clearElementHTML(busContainerElement);
    showRoute(url);
  }
});

/**
 ***************** Filters
 */

/**
 * Method to show Filter Buttons
 */
function showFilterButtons() {
  filtersContainerElement.classList.remove('hide');
};

/**
 * Method to hide Filter Buttons
 */
function hideFilterButtons() {
  filtersContainerElement.classList.add('hide');
};

/**
 * Method to show only Recommended Trip
 */
const showRecommendedTripOnly = function () {
  const myTripElements = busContainerElement.querySelectorAll('.my-trip');

  myTripElements.forEach(trip => {
    if (trip.classList.contains('recommended')) {
      trip.classList.remove('recommended-border');
      trip.classList.remove('hide');
    } else {
      trip.classList.add('hide');
    }
  });
};

/**
 * Event Listener for Best Trip button
 */
bestTripButton.addEventListener('click', function () {
  showRecommendedTripOnly();
});

/**
 * Method to show all Trips
 */
const showAllTrips = function () {
  const myTripElements = busContainerElement.querySelectorAll('.my-trip');

  myTripElements.forEach(trip => {
    if (trip.classList.contains('recommended')) {
      trip.classList.add('recommended-border');
    }
    trip.classList.remove('hide');
  });
};

/**
 * Event Listener for All Trips button
 */
allTripsButton.addEventListener('click', function () {
  showAllTrips();
});

/**
 * Method to show Min Time Trips
 */
const showMinTimeTrips = function () {
  const myTripElements = busContainerElement.querySelectorAll('.my-trip');
  let minTime = Number.MAX_SAFE_INTEGER;

  myTripElements.forEach(trip => {
    trip.classList.remove('recommended-border');
    trip.classList.add('hide');
    if (minTime > trip.dataset.durationtotal) {
      minTime = trip.dataset.durationtotal;
    }
  });

  myTripElements.forEach(trip => {
    if (trip.dataset.durationtotal === minTime) {
      trip.classList.remove('hide');
    }
  });
};

/**
 * Event Listener for Min Time Trip button
 */
minTimeTripButton.addEventListener('click', function () {
  showMinTimeTrips();
});

/**
 * Method to show Min Transfer Trips
 */
const showMinTransferTrips = function () {
  const myTripElements = busContainerElement.querySelectorAll('.my-trip');
  let minTransfer = Number.MAX_SAFE_INTEGER;

  myTripElements.forEach(trip => {
    trip.classList.remove('recommended-border');
    trip.classList.add('hide');
    if (minTransfer > trip.dataset.numofsegments) {
      minTransfer = trip.dataset.numofsegments;
    }
  });

  myTripElements.forEach(trip => {
    if (trip.dataset.numofsegments === minTransfer) {
      trip.classList.remove('hide');
    }
  });
};

/**
 * Event Listener for Min Transfer Trip button
 */
minTransferTripButton.addEventListener('click', function () {
  showMinTransferTrips();
});

/**
 * Method to show Min Walk Trips
 */
const showMinWalkTrips = function () {
  const myTripElements = busContainerElement.querySelectorAll('.my-trip');
  let minWalk = Number.MAX_SAFE_INTEGER;

  myTripElements.forEach(trip => {
    trip.classList.add('hide');
    if (minWalk > trip.dataset.durationwalking) {
      minWalk = trip.dataset.durationwalking;
    }
  });

  myTripElements.forEach(trip => {
    if (trip.dataset.durationwalking === minWalk) {
      trip.classList.remove('hide');
    }
  });
};

/**
 * Event Listener for Min Walk Trip button
 */
minWalkTripButton.addEventListener('click', function () {
  showMinWalkTrips();
});