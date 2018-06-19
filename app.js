'use strict';

// Imports dependencies and set up http server
const
    express = require('express'),
    bodyParser = require('body-parser'),
    request = require('request'),
    app = express().use(bodyParser.json())// creates express http server


//const facebook_token = "EAAV7ZCmOQmEABANF9YN3xKxVMgQa3JTIjC018c8ojUTCBFF2bT3cZCPheqrtGvuZBMFtTN0pQlOnWh0mmxBZAczMQAZCXA8HrYPYQFUvp95wZArKUva7rhJ8ODEWUCeTT1SdwSdqanwMBNUFqRP4dOt8MKaYLyK4CG2dZAYKdAEjQZDZD";
const facebook_token = "EAAG3CBTuXN0BAJuZAYaui52SCsRuUoBX47cXjU644hZA3dL2ZAnNdLvBgfr9WlWOI8wCHh006nwglr5yDQZC7u9EDkycKqkOAbEj0J7ohF8CX4Sglq6fRFkU3ZChR8MypR5TNsmeOijTNaZCo709jnnRDEWgI4IzAMqqcyAEZBXUgZDZD";

// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));

app.post('/speech-webhook', function (req, res) {
    // Get the city and date from the request
    let number = req.body.queryResult.parameters['number-integer'];
    res.json({ 'fulfillmentText': 'your ticket number ' + number + ' is under processing'});
    //res.sendStatus(200)
});

app.get('/webhook', function (req, res) {
    let VERIFY_TOKEN = "hello-webhook";
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];
    if (mode && token) {

        // Checks the mode and token sent is correct
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {

            // Responds with the challenge token from the request
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);

        } else {
            // Responds with '403 Forbidden' if verify tokens do not match
            res.sendStatus(403);
        }
    };
    /*let messaging_events = req.body.entry[0].messaging
    console.log('message received with events : ' + messaging_events.length);
    for (let i = 0; i < messaging_events.length; i++) {
        let event = req.body.entry[0].messaging[i]
        let sender = event.sender.id
        console.log('sender id is : ' + sender);
        if (event.message && event.message.text) {
            handleMessage(sender, event.message, res);
        }
    }*/
});


function firstEntity(nlp, name) {
    return nlp && nlp.entities && nlp.entities[name] && nlp.entities[name][0];
}

function handleMessage(sender, message, res) {
    // check greeting is here and is confident
    const greeting = firstEntity(message.nlp, 'greetings');
    if (greeting && greeting.confidence > 0.8) {
        sendTextMessage(sender, 'Hi there!', res);
    } else {
        sendTextMessage(sender, "Text received, echo: " + message.text.substring(0, 200), res)
    }
}

function sendTextMessage(sender, text, res) {
    let messageData = { text:text }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:facebook_token},
        method: 'POST',
        json: {
            recipient: {id:sender},
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        } else {
            console.log('Facebook Response: ', response.body);
            res.sendStatus(200);
        }
    })
}