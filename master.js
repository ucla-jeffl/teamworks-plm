const https = require('https');
var request = require("request");
var rp = require('request-promise');

var moment = require('moment');

var bte = require('./BTEvents');

//console.log('testing');
var events = bte.getEvents();
//console.log(events.length);
var firstTen = events.filter( e => {return e.studentId == '304882242';});
console.log(firstTen.length);

var successes = [];
var failures = [];
var promises = [];

firstTen.forEach( event => {
    //console.log(event.tw_eventurl);
    promises.push( getEventBody(event.tw_eventurl).then( parsedBody => {
            //console.log('go another event: ' + parsedBody['start']);
            //processDate(parsedBody.end);
            //console.dir( eventUpdateBody( parsedBody ) );
            return eventUpdateBody( parsedBody );
        }).then( newEvent => {
            // console.log( newEvent );
            // return;
            return putEventBody(event.tw_eventurl, newEvent);
        }).then( () => {
            successes.push( {event: event} );
            return true;
        }).catch( err => {
            failures.push( { event: event, error: err } );        
            return;
        })
    );
});

Promise.all(promises).then( () => {
    console.log('********************************************************************************');
    console.log(' Successess: ');
    console.log('********************************************************************************');
    console.log(successes);
    console.log('********************************************************************************');
    console.log(' Failures: ');
    console.log('********************************************************************************');
    console.log(failures);
})

function putEventBody( url, updatedBody ) {
    //build the requet options for the GET call
    var options = { method: 'PUT',
        uri: url,
        body: updatedBody,
        headers: 
            { 'cache-control': 'no-cache',
            authorization: 'bearer 5FC4E3CA-AE8A-0962-96ECF90FDA4AAC8E' },
        json: true // Automatically parses the JSON string in the response
    };

    return rp(options);
}

function getEventBody(url) {
    //build the requet options for the GET call
    var options = { method: 'GET',
        url: url,
        headers: 
            { 'cache-control': 'no-cache',
            authorization: 'bearer 5FC4E3CA-AE8A-0962-96ECF90FDA4AAC8E' },
        json: true // Automatically parses the JSON string in the response
    };

    return rp(options);

}

function eventUpdateBody(currentBody) {
    var update = { };
    update.location = currentBody.location;
    update.allDay = currentBody.allDay;
    update.appointmentType = currentBody.appointmentType;
    update.attendees = currentBody.attendees;
    update.description = currentBody.description;
    //update the mandatory to true based on input from Jo
    update.mandatory = true;
    update.reminders = currentBody.reminders;
    update.label = currentBody.label;
    //process the times fwd by +4 hours to adjust
    update.end = processDate( currentBody.end );
    console.log(`Shift: ${currentBody.end} --> ${update.end}`)
    update.start = processDate( currentBody.start );
    console.log(`Shift: ${currentBody.start} --> ${update.start}`)
    update.timeZone = currentBody.timeZone;
    update.recurs = currentBody.recurs;
    
    return update;
}

function processDate(current) {
    var newDate = moment(current);
    //console.log(`Shift: ${newDate.utc().format().substring(0,19) + "Z"} --> ${newDate.add(4, 'h').utc().format().substring(0,19) + "Z"}`);
    return newDate.subtract(-4, 'hours').format().substring(0,19) + "Z";
}