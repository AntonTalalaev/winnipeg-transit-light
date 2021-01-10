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
      } else {
        Promise.reject({ resp: resp.status, resp: resp.statusText });
      }
    })
    .catch(err => {
      // message to the user
      console.log(err);
    });
};

/**
 * 
 * @param {*} places 
 * @param {*} listElemet 
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


const displayNoPlacesFoundMessage = function () {
  // display error to the user, ask to reenter query for search
  console.log('Error: places not found');
}

const showPlaces = function (url, listElemet) {
  fetchJSON(url)
    .then(json => {
      if (json.features.length === 0) {
        displayNoPlacesFoundMessage();
      } else {
        displayPlacesElements(json.features, listElemet);
      }
    })
    .catch(err => {
      // display message to user
      console.log(err);
    });
}

const validateInput = function (input) {
  format = /[!@#$%^&*()_+\=\[\]{};\\|<>\/?]+/;
  if (input === undefined || input === null || input === "") {
    return false;
  } else if (format.test(input)) {
    // show error for user
    console.log('Error: special characters used in input');
    return false;
  }
  return true;
}

const clearElementHTML = function (elemet) {
  elemet.innerHTML = '';
}

/**
 * 
 * @param {*} inputElement 
 * @param {*} listElemet 
 */
const searchPoints = function (inputElement, listElemet) {
  clearElementHTML(listElemet);
  if (validateInput(inputElement.value)) {
    const url = mapboxURLBase + inputElement.value + mapboxURLArgs;
    showPlaces(url, listElemet);
  }
}


/**
 * EventListener for search origin point
 */
originInput.addEventListener('keyup', function (event) {
  if (event.keyCode === 13) {
    searchPoints(originInput, originsListElemet);
  }
});

/**
 * EventListener for search origin point
 */
destinationInput.addEventListener('keyup', function (event) {
  if (event.keyCode === 13) {
    searchPoints(destinationInput, destinationsListElemet);
  }
});

/**
 * 
 * @param {*} element 
 * @param {*} listElemet 
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
 * EventListener for selecting origin point to route
 */
originsListElemet.addEventListener('click', function (event) {
  selectPlace(event.target, originsListElemet);
});

/**
 * EventListener for selecting destination point to route
 */
destinationsListElemet.addEventListener('click', function (event) {
  selectPlace(event.target, destinationsListElemet);
});


const displayNoRoutesFoundMessage = function () {
  //
};


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

const getRideSegment = function (segment) {
  const duration = segment.times.durations.total;
  const routeName = segment.route.name;
  return `<li>
            <i class="fas fa-bus" aria-hidden="true"></i>Ride the ${routeName} 
            for ${duration} minutes.
          </li>`;
};


const getTransferSegment = function (segment) {
  const fromStop = segment.from.stop;
  const toStop = segment.to.stop;
  return `<li>
            <i class="fas fa-ticket-alt" aria-hidden="true"></i>Transfer from stop
            #${fromStop.key} - ${fromStop.name} to stop #${toStop.key} - ${toStop.name}.
          </li>`;
};


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

const insertRouteElements = function (routes) {
  routes.forEach(route => {
    busContainerElement.insertAdjacentHTML('beforeend', createRouteHTML(route));
  });
};


const setRecommendedRoute = function () {
  const myTripElements = busContainerElement.querySelectorAll('.my-trip');
  let minDuration = Number.MAX_SAFE_INTEGER;
  let bestTrip;
  myTripElements.forEach(trip => {
    if (minDuration > trip.dataset.durationtotal) {
      minDuration = trip.dataset.durationtotal;
    }
  });
  minDuration += minDuration * 10 / 100;
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
}


const showRoute = function (url) {
  fetchJSON(url)
    .then(json => {
      if (json.plans.length === 0) {
        displayNoRoutesFoundMessage();
      } else {
        insertRouteElements(json.plans);
        setRecommendedRoute();
      }
    })
    .catch(err => {
      // display message to user
      console.log(err);
    });

}


const getLocationStr = function (place) {
  const placeLat = place.dataset.lat;
  const placeLon = place.dataset.long;
  return `geo/${placeLat},${placeLon}`;
}


const getTripPlannerURL = function () {
  const originLocationStr = getLocationStr(originsListElemet.querySelector('.selected'));
  const destinationLocationStr = getLocationStr(destinationsListElemet.querySelector('.selected'));
  const url = `${tripPlannerURL}&origin=${originLocationStr}&destination=${destinationLocationStr}`;
  return url;
};


planTripElement.addEventListener('click', function (event) {
  // If there isn't at least 1 starting location and 1 destination selected, clicking the plan my trip button should display an appropriate message to the user. 
  const url = getTripPlannerURL();
  clearElementHTML(busContainerElement);
  showRoute(url);
  showFilterButtons();
});




/**
 ***************** Filters
 */


function showFilterButtons() {
  filtersContainerElement.classList.remove('hide');
};

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


bestTripButton.addEventListener('click', function () {
  showRecommendedTripOnly();
});

const showAllTrips = function () {
  const myTripElements = busContainerElement.querySelectorAll('.my-trip');
  myTripElements.forEach(trip => {
    if (trip.classList.contains('recommended')) {
      trip.classList.add('recommended-border');
    }
    trip.classList.remove('hide');
  });
};

allTripsButton.addEventListener('click', function () {
  showAllTrips();
});



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
}

minTimeTripButton.addEventListener('click', function () {
  showMinTimeTrips();
});

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
}



minTransferTripButton.addEventListener('click', function () {
  showMinTransferTrips();
});

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
}

minWalkTripButton.addEventListener('click', function () {
  showMinWalkTrips();
});