'use strict';

// Imports dependencies and set up http server
const
    express = require('express'),
    bodyParser = require('body-parser'),
    request = require('request'),
    app = express().use(bodyParser.json())// creates express http server


const facebook_token = "EAAV7ZCmOQmEABANF9YN3xKxVMgQa3JTIjC018c8ojUTCBFF2bT3cZCPheqrtGvuZBMFtTN0pQlOnWh0mmxBZAczMQAZCXA8HrYPYQFUvp95wZArKUva7rhJ8ODEWUCeTT1SdwSdqanwMBNUFqRP4dOt8MKaYLyK4CG2dZAYKdAEjQZDZD";


// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));

app.post('/speech-webhook', function (req, res) {
    // Get the city and date from the request
    let number = req.body.queryResult.parameters['number-integer'];
    res.json({ 'fulfillmentText': 'your ticket number ' + number + ' is under processing'});
    //res.sendStatus(200)
});

app.post('/webhook', function (req, res) {
    let messaging_events = req.body.entry[0].messaging
    for (let i = 0; i < messaging_events.length; i++) {
        let event = req.body.entry[0].messaging[i]
        let sender = event.sender.id
        if (event.message && event.message.text) {
            handleMessage(sender, event.message);
        }
    }
    res.sendStatus(200)
});

function firstEntity(nlp, name) {
    return nlp && nlp.entities && nlp.entities[name] && nlp.entities[name][0];
}

function handleMessage(sender, message) {
    // check greeting is here and is confident
    const greeting = firstEntity(message.nlp, 'greetings');
    if (greeting && greeting.confidence > 0.8) {
        sendTextMessage(sender, 'Hi there!');
    } else {
        sendTextMessage(sender, "Text received, echo: " + message.text.substring(0, 200))
    }
}

function sendTextMessage(sender, text) {
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
        }
    })
}