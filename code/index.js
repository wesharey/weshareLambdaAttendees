"use strict";

const Aws = require("aws-sdk");
const Nbrite = require("nbrite");

const attendeesFileName = "attendees.json";
const contentType = "application/json";
const bucket = "weshare-events-eu-central";

const s3 = new Aws.S3({
    apiVersion: "2006-03-01"
});
const nbrite = new Nbrite({
    token: process.env.eventbriteToken
});

const getEventIds = () => {
    // TODO: GET RESULTS FROM S3's EVENTS.JSON
	return nbrite.get("/users/me/owned_events", {
		status: "live"
	}).then(function (res) {
		if (res.events) {
			return res.events.map(event => event.id);
		}
		return [];
	});
};

const getAttendees = (eventId) => {
	return nbrite.get(`/events/${eventId}/attendees/`, {
		status: "attending"
	});
};

const mergeEventsAndAttendees = (eventIds, attendeesInfo) => {
    var out = {};
    eventIds.forEach((eventId, index) => {
        out[eventId] = attendeesInfo[index].attendees.length;
    });
    return out;
}

const getAllAttendeesPromises = eventIds => eventIds.map(eventId => getAttendees(eventId));

const writeOnS3 = (eventsAttendees) => {
    const params = {
        Bucket: bucket,
        Key: attendeesFileName,
        Body: JSON.stringify(eventsAttendees, null, 2),
        ContentType: contentType,
        ACL: "public-read"
    };
    s3.putObject(params, (err, eventsAttendees) => {
        if (err) {
            console.log(err);
            const message = `Error putting object ${attendeesFileName} in bucket ${bucket}. Make sure this function has access to it, and the bucket is in the same region as this function.`;
            console.log(message);
            callback(message);
        } else {
            const message = `Done writing ${attendeesFileName} with content type ${contentType}`;
            console.log(message);
            callback(null, message);
        }
    });
}

const handler = (event, context, callback) => {
    console.log("Received event:", JSON.stringify(event, null, 2));
    getEventIds().then((eventIds) => {
        Promise.all(getAllAttendeesPromises(eventIds))
            .then(attendeesInfo => {
                var eventsAttendees = mergeEventsAndAttendees(eventIds, attendeesInfo);
                writeOnS3(eventsAttendees);
            });
    });
};

exports.handler = handler;

//handler(null, null, function() { console.log('end') });