const https = require('https');
var request = require("request");
var rp = require('request-promise');

var moduleName = 'TWUtility:';

exports.getAthletes = function(teamid) {
    console.log(moduleName, `Get Athletes with the TW API - this one takes a few seconds...`);

    //grab the teamid and use default StudentAthlete(4651) if none provided
    var tid = (!teamid)?4651:tid;
    //build the requet options for the GET call
    var options = { method: 'GET',
        url: `https://www.teamworksapp.com/api/user/v2/teams/${tid}/users?userTypes=Athlete&athleteStatus=Current&fields=id,orgID,lastName,firstName`,
        headers: 
            { 'cache-control': 'no-cache',
            authorization: 'bearer 5FC4E3CA-AE8A-0962-96ECF90FDA4AAC8E' },
        json: true // Automatically parses the JSON string in the response
    };

    return rp(options);
}

exports.postAppointment = function(appt, twUserId) {
    var apptBody = processApptBody(appt.sessionName, appt.facilitatorName, appt.sessionKey, appt.start, appt.end, twUserId);
    
    var options = {
        method: 'POST',
        uri: 'https://www.teamworksapp.com/api/calendar/v1/calendars/events',
        headers: 
            { 'cache-control': 'no-cache',
            authorization: 'bearer 5FC4E3CA-AE8A-0962-96ECF90FDA4AAC8E' },
        body: apptBody,
        json: true // Automatically stringifies the body to JSON
    };
    
    return rp(options)
        .then(function (parsedBody) {
            // POST succeeded...
            console.log(parsedBody);
            return parsedBody;
        });
}

exports.deleteAppointment = function(apptid) {
    var options = {
        method: 'DELETE',
        uri: `https://www.teamworksapp.com/api/calendar/v1/calendars/events/${apptid}`,
        headers: 
            { 'cache-control': 'no-cache',
            authorization: 'bearer 5FC4E3CA-AE8A-0962-96ECF90FDA4AAC8E' },
        json: true // Automatically stringifies the body to JSON
    };
    
    return rp(options)
        .then(function (parsedBody) {
            // DELETE succeeded...
            return true;
        });
}

function processApptBody(session, facilitator, syncid, start, end, userid) {
    var body = {
        "label": `Peer Learning: ${session} with ${facilitator}`,
        "description": `syncid: [${syncid}] (do not delete)`,
        "location": "Covel Commons, 2nd Floor",
        "appointmentType": "Academic Support",
        "start": start,
        "end": end,
        "timeZone": "America/Los_Angeles",
        "recurs": false,
        "allDay": false,
        "private": false,
        "attendees": [
            {
                "id": userid,
                "type": "individual"
            }
        ],
        "reminders": [
            {
                "method": "sms",
                "minutes": 60
            }
        ]
    };
    return body;
}
