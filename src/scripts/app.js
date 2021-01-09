
// Default public token: pk.eyJ1IjoiYW50b250YWxhbGFldiIsImEiOiJja2pwODhheXowdXJlMnJxbDcyY3FtcGcyIn0.EaOqmEvF_DnjGnlxnMlbVw

// 1) to search places by word 'burger'
// GET	https://api.mapbox.com/geocoding/v5/mapbox.places/burger.json?access_token=pk.eyJ1Ijoiam9obmF0aGFubml6aW9sIiwiYSI6ImNqcG5oZjR0cDAzMnEzeHBrZGUyYmF2aGcifQ.7vAuGZ0z6CY0kXYDkcaOBg&limit=10&bbox=-97.325875,49.766204,-96.953987,49.99275
// Returns:
// JSON.features[0].place_name = 'Nuburger, 472 Stradbrook Ave., Winnipeg, Manitoba R3L 1Y7, Canada';
// JSON.features[0].centre = [ -97.14541, 49.877398 ];

// 2) to plan the route: Novavista Drive (data-long="-97.0987949" data-lat="49.8234854") to Osborne Street (data-long="-97.1381831" data-lat="49.870168")
// GET https://api.winnipegtransit.com/v3/trip-planner.json?origin=geo/49.8234854,-97.0987949&api-key=ZPFv2Zx6ny1KrlPKnfe&destination=geo/49.870168,-97.1381831
// Returns:
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
// [0] Walk for 2 minutes to stop #40195 - Westbound Regent at Stapon
// [1] Ride the Route 75 Crosstown East for 23 minutes.
// [2] Transfer from stop #50404 - Westbound Bishop Grandin at Dakota to stop #50486 - Northbound Dakota at Bishop Grandin
// [3] Ride the Route 16 Selkirk-Osborne for 12 minutes.
// [4] Walk for 2 minutes to your destination.

const mapboxKey = 'pk.eyJ1IjoiYW50b250YWxhbGFldiIsImEiOiJja2pwODhheXowdXJlMnJxbDcyY3FtcGcyIn0.EaOqmEvF_DnjGnlxnMlbVw';
const transitKey = 'J9BnB98MwTTTmVYDGXke';

const mapboxURLBase = `https://api.mapbox.com/geocoding/v5/mapbox.places/`
const mapboxURLArgs = `.json?access_token=${mapboxKey}&limit=10&bbox=-97.325875,49.766204,-96.953987,49.99275`


const originInput = document.querySelector('.origin-form input');
const destinationInput = document.querySelector('.destination-form input');

const originsListElemet = document.querySelector('.origins');
const destinationsListElemet = document.querySelector('.destinations');

const planTripElement = document.querySelector('.plan-trip');
const myTripElement = document.querySelector('.my-trip');


let latitude;
let longitude;


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
    console.log(input);

    format = /[!@#$%^&*()_+\=\[\]{};\\|<>\/?]+/;
    if (input === undefined || input === null || input === "") {
        return false;
    } else if (format.test(input)) {
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
const searchPoints = function (inputElement, listElemet){
    clearElementHTML(listElemet);
    if (validateInput(inputElement.value)) {
        const url = mapboxURLBase + inputElement.value + mapboxURLArgs;
        console.log(url);
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
}

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











const geolocationError = function () {
    // display error on the page
    console.log('Geolocation is NOT available');
}

/**
 * Method to set geolocation data
 */
const updateGeolocation = function () {
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition((position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            init(lat, lon);
        });
    } else {
        geolocationError();
    }
};


/**
 * Method to initialize an application
 */
const init = function (lat, lon) {
    originInput.parentElement.onsubmit = "return false;"
    destinationInput.parentElement.onsubmit = "return false;"
    latitude = lat;
    longitude = lon;
}