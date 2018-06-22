var TwitterPackage = require('twitter');
const {Wit, log} = require('node-wit');

var secret = {
    consumer_key: 'oQdeXLXhL1SMXiQh4cfqMihLq',
    consumer_secret: 'YOik9p1uK00Poem0cbAGmEa4VmuOG7Wg3YeduaoM31rmXfk8Yk',
    access_token_key: '54640919-Juf1Auhf2W7gz1kL6nhOG7mj5QauAZJa1rtMmVbxr',
    access_token_secret: 'gemggeARKcBB1A205EkT366GO4FxuKPWd0ohE73aulUEX'
}
export.module = new TwitterPackage(secret);