'use strict';

// Imports dependencies and set up http server
const
    express = require('express'),
    bodyParser = require('body-parser'),
    app = express().use(bodyParser.json()),
    fd = require('freshdesk-api')

const
    Twitter = require('./twitter-bot'),
    {Wit, log} = require('node-wit');

const
    request = require('request'),
    util = require('util')

const
    facebook_token = "EAAG3CBTuXN0BAJuZAYaui52SCsRuUoBX47cXjU644hZA3dL2ZAnNdLvBgfr9WlWOI8wCHh006nwglr5yDQZC7u9EDkycKqkOAbEj0J7ohF8CX4Sglq6fRFkU3ZChR8MypR5TNsmeOijTNaZCo709jnnRDEWgI4IzAMqqcyAEZBXUgZDZD";

const FD_API_KEY = "yJResqF8HaIMhfVUZFO";
const FD_ENDPOINT = "pitneybowessoftwareindia";
const Freshdesk = new fd('https://'+FD_ENDPOINT+'.freshdesk.com', FD_API_KEY);

var newTicketCustomerId = undefined;

// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));

app.post('/speech-webhook', function (req, res) {
    // Get the city and date from the request
    let number = req.body.queryResult.parameters['number-integer'];
    res.json({ 'fulfillmentText': 'your ticket number ' + number + ' is under processing'});
    //res.sendStatus(200)
});

app.post('/alexa-webhook', function (req, res) {
    //console.log(util.inspect(req.body, false, null));
    console.log('request type : ' + req.body.request.type + ' and request id is : ' + req.body.request.requestId);
    let responseBody = {
        'version': '1.0',
        'response': {
            'outputSpeech': {
                'type': 'PlainText',
                'text': 'Please provide valid ticket number'
            },
            'shouldEndSession': true
        },
        'sessionAttributes': {}
    };
    if(req.body.request.type === 'LaunchRequest'){
        responseBody.response.shouldEndSession = false;
        responseBody.response.outputSpeech.text = 'What is your ticket number?';
        res.send(responseBody);
    } else if(req.body.request.intent && req.body.request.intent.slots){
        //console.log('ticket query : ' + util.inspect(req.body, false, null));
        var ticketNum = req.body.request.intent.slots.numberslot.value;

        if (ticketNum === undefined){
            ticketNum = 1;
        }

        Freshdesk.getTicket(ticketNum, function(err, data, extra){
            console.log("Ticket with ID 5 : " + util.inspect(data, false, null));
            if(err){
                console.log(err);
            };

            if(data){
                let status = data.status;
                let ticketStatus = (status === 2) ? "Open" : (status === 3) ? "Pending" : (status === 4) ?
                    "Resolved" : (status === 5) ? "Closed" : (status === 6) ?
                        "Waiting on customer" : "Waiting on third party";
                responseBody.response.outputSpeech.text = 'Status of ticket number ' + ticketNum + ' is ' + ticketStatus;
            }

            res.send(responseBody);
        });
    } else {
        res.send(responseBody);
    }
});

app.post('/alexa-webhook-create-intent', function (req, res) {
    //console.log(util.inspect(req.body, false, null));
    console.log('request type : ' + req.body.request.type + ' and request id is : ' + req.body.request.requestId);
    let responseBody = {
        'version': '1.0',
        'response': {
            'outputSpeech': {
                'type': 'PlainText',
                'text': 'Please provide a valid request'
            },
            'shouldEndSession': true
        },
        'sessionAttributes': {}
    };

    if(req.body.request.type === 'LaunchRequest'){
        responseBody.response.shouldEndSession = false;
        responseBody.response.outputSpeech.text = 'What is your customer id?';
        res.send(responseBody);
    } else if(req.body.request.type === 'IntentRequest' && req.body.request.intent.slots && newTicketCustomerId === undefined){
        responseBody.response.shouldEndSession = false;
        newTicketCustomerId = req.body.request.intent.slots.customerid.value
        responseBody.response.outputSpeech.text = 'What kind of ticket you want to create? Refund or Address Change?';
        res.send(responseBody);
    } else if(req.body.request.intent && req.body.request.intent.slots){
        var ticketType = req.body.request.intent.slots.ticket_description.value;

        let newTicket = {
            'name': newTicketCustomerId,
            'email': newTicketCustomerId+'@gmail.com',
            'subject': 'Issue reported by Alexa User',
            'description': 'Process ' + ticketType + ' request',
            'status': 2,
            'priority': 1
        }

        Freshdesk.createTicket(newTicket, function(err, data){
            if(err){
                console.log(err);
            };
            console.log(util.inspect(data, false, null));
            newTicketCustomerId = undefined;
            responseBody.response.outputSpeech.text = 'Your ticket number is : ' + data['id'];
            res.send(responseBody);
        });
    } else {
        res.send(responseBody);
    }
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
});

app.post('/webhook', function (req, res) {
    let messaging_events = req.body.entry[0].messaging;

    for (let i = 0; i < messaging_events.length; i++) {
        let event = req.body.entry[0].messaging[i]
        let sender = event.sender.id
        console.log('sender id is : ' + sender);
        if (event.message && event.message.text) {
            handleMessage(sender, event.message);
        }
    }
    res.sendStatus(200);
});

function firstEntity(nlp, name) {
    return nlp && nlp.entities && nlp.entities[name] && nlp.entities[name][0];
}

function firstIntent(nlp) {
    return nlp && nlp.entities && nlp.entities['intent'] && nlp.entities['intent'][0];
}

function handleMessage(sender, message) {
    console.log(util.inspect(message, false, null));
    const intent = firstIntent(message.nlp);

    if (intent &&  intent.confidence > 0.5 ){
        if(intent.value === 'newticket'){
            createNewTicket(sender, message.text);
        } else if(intent.value === 'greeting'){
            sendTextMessage(sender, 'Hi there! \nHow may I help you today?');
        } else if(intent.value === 'ticketstatus'){
            getTicketStatus(sender, message.nlp.number.value);
        }
    } else {
        sendTextMessage(sender, "Text received, echo: " + message.text.substring(0, 200))
    }
}

function getTicketStatus(sender, number) {
    Freshdesk.getTicket(number, function(err, data, extra){
        if(err){
            console.log(err);
        };

        if(data){
            let status = data.status;
            let ticketStatus = (status === 2) ? "Open" : (status === 3) ? "Pending" : (status === 4) ?
                "Resolved" : (status === 5) ? "Closed" : (status === 6) ?
                    "Waiting on customer" : "Waiting on third party";
        }
        sendTextMessage(sender, 'Status of ticket number ' + number + ' is ' + ticketStatus);
    });
}

function createNewTicket(sender, description) {
    let CREATE_PATH = "/api/v2/tickets";
    let URL =  "https://" + FD_ENDPOINT + ".freshdesk.com"+ CREATE_PATH;
    let name = sender;
    let isFacebook = true;

    if(sender.startsWith('@')){
        name = name.slice(1);
        isFacebook = false;
    }

    let newTicket = {
        'name': name,
        'email': name+'@gmail.com',
        'subject': isFacebook ? 'Issue reported by Facebook User':'Issue reported by Twitter User',
        'description': description,
        'status': 2,
        'priority': 1
    }

    Freshdesk.createTicket(newTicket, function(err, data){
        if(err){
            console.log(err);
        };
        console.log(util.inspect(data, false, null));
        sendTextMessage(sender, 'Sorry for the inconvenience.\nWe have created a support ticket for the same. \nYour ticket number is : ' + data['id']);
        /*if(fdRes.statusCode == 201){
            let location = body['id'];
            sendTextMessage(sender, 'Sorry for the inconvenience.\nWe have created a support ticket for the same. \nYour ticket number is : ' + location);
        }*/
    });
}

function handleMessageFacebookNLP(sender, message) {
    const greeting = firstEntity(message.nlp, 'greetings');
    const thanks = firstEntity(message.nlp, 'thanks');
    const bye = firstEntity(message.nlp, 'bye');
    if (greeting && greeting.confidence > 0.5) {
        sendTextMessage(sender, 'Hi there!');
        sendTextMessage(sender, 'How may I help you today?');
    } else if (thanks && thanks.confidence > 0.5) {
        sendTextMessage(sender, 'You are welcome!');
    } else if (bye && bye.confidence > 0.5) {
        sendTextMessage(sender, 'See you again!');
    }
}

function sendTextMessage(sender, text) {
    if(sender.startsWith('@')){
        let statusObj = {status: sender + " " + text}
        Twitter.post('statuses/update', statusObj,  function(error, tweetReply, response){

            //if we get an error print it out
            if(error){
                console.log(error);
            }

            //print the text of the tweet we sent out
            console.log(tweetReply.text);
        });
    } else {
        sendFacebookMessage(sender, text);
    }

}

function sendFacebookMessage(sender, text) {
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
        }
    })
}

Twitter.stream('statuses/filter', {track: '#Tipdia'}, function(stream) {
    stream.on('data', function(tweet) {
        console.log(tweet.text);

        const client = new Wit({accessToken: '3AFY5YHPBPCRZFIZ7RCNVKYYJ7A3T7NZ'});
        client.message(tweet.text, {})
            .then((data) => {
            console.log('Yay, got Wit.ai response: ' + JSON.stringify(data));
        const intent = firstIntent(data);
        if (intent &&  intent.confidence > 0.5 ){
            if(intent.value === 'newticket'){
                createNewTicket('@'+tweet.user.screen_name, tweet.text);
            } else if(intent.value === 'greeting'){
                sendTextMessage('@'+tweet.user.screen_name, 'Hi there! \nHow may I help you today?');
            } else if(intent.value === 'ticketstatus'){
                getTicketStatus('@'+tweet.user.screen_name, 23);
            }
        } else {
            sendTextMessage(sender, "Text received, echo: " + message.text.substring(0, 200))
        }
    })
    .catch(console.error);
    });

    stream.on('error', function(error) {
        console.log(error);
    });
});
