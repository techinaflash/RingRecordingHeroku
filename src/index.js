
'use strict'

const express = require('express')
const proxy = require('express-http-proxy')
const bodyParser = require('body-parser')
//const axios = require('axios');
//const qs = require('qs');
const _ = require('lodash')
const config = require('./config')
const commands = require('./commands')
const helpCommand = require('./commands/help')
const users = require('./helpers/users');
const confirmation = require('./helpers/confirmation');
const exportNote = require('./helpers/exportNote');
//const signature = require('./helpers/verifySignature');
const slack = require('./helpers/slack');
const syncro = require('./helpers/syncro');
var ringcentral = require('./helpers/ringcentral');
//const apiUrl = 'https://slack.com/api';
//var async = require("async");
const axios = require('axios');



let bot = require('./bot')

let app = express()

if (config('PROXY_URI')) {
  app.use(proxy(config('PROXY_URI'), {
    forwardPath: (req, res) => { return require('url').parse(req.url).path }
  }))
}

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.get('/', (req, res) => { res.sendFile('./src/index.html') })

app.get('/test', (req, res) => {
  console.log('Starting Test')
  const test = slack.postMessage();
  console.log(test)
})

app.post('/slack/events', (req, res) => {
  //console.log(req)
  const payload = JSON.parse(req.body.payload);
  console.log('******************PAYLOAD START*************************')
  console.log(payload)
  console.log('******************PAYLOAD END*************************')
  
  const {type, user, message, submission} = payload;
  
  // Get user info of the person who interacted with slack
  const getUserInfo = new Promise((resolve, reject) => {
    users.find(payload.user.id).then((result) => {
      /* console.log('**********USER FIND RESULT*****************')
      console.log(result) */
      resolve(result.data.user.real_name);
    }).catch((err) => { reject(err); });
  });
  
  // Once successfully get the user info, open a dialog with the info
  getUserInfo.then((userInfoResult) => {
    //console.log(userInfoResult)
    if(type === 'message_action') {
      slack.openDialog(payload, userInfoResult).then((result) => {
        if(result.data.error) {
          console.log(result.data);
          res.sendStatus(500);
        } else {
          res.sendStatus(200);
        }
      }).catch((err) => {
        res.sendStatus(500);
      });
    } else if (type === 'dialog_submission') {
      // immediately respond with a empty 200 response to let
      // Slack know the command was received
      res.send('');
      
      
        syncro.ticketNumberToID(submission.ticket).then((result) => {
          //console.log('ticketNumberToID Result')
          console.log('Ticket ID is -> ' + result.data.tickets[0].id)
          console.log('State from dialog is -> ' + payload.state)
          var promise = syncro.uploadFile(result.data.tickets[0].id, payload.state)
          return promise;
          
          //syncro.commentTicket(submission.ticket, userInfoResult, submission.comment)
        }).then((result) => {
          console.log('Result is ->' + result)
          syncro.commentTicket(submission.ticket, userInfoResult, submission.comment)
          //syncro.uploadFile(result, 'https://files.slack.com/files-pri/T04P48F8P-FN5TGAQTA/matthew_rebstock_inbound_2019-09-09t17-50-53.360z.mp3?pub_secret=d14e5dc30f')
          //syncro.uploadFile(result, payload.state)
        }).catch((err) => {
          console.log('*****************Error**********************')
          console.log(err)
        });

        
      
        //console.log(response.data.tickets);
        //return response.data.tickets
        //console.log('Result of Ticket Number to ID -> ' + response.data.tickets)
        //syncro.uploadFile(response.data.tickets[0].id, payload.state)
        //syncro.commentTicket(submission.ticket, userInfoResult, submission.comment)
      
      //.catch(error => console.log(error));
      
      
      //console.log('Result of Ticket Number to ID -> ' + ticketData)
      
  
      
      // DM the user a confirmation message
      //slack.postEphemeral(payload);

      //Delete FTP file after successful upload to syncro

    }

    

  })
  .catch((err) => { console.error(err); });

  
});

/* app.post('/commands/starbot', (req, res) => {
  let payload = req.body

  if (!payload || payload.token !== config('STARBOT_COMMAND_TOKEN')) {
    let err = '✋  Star—what? An invalid slash token was provided\n' +
              '   Is your Slack slash token correctly configured?'
    console.log(err)
    res.status(401).end(err)
    return
  }

  let cmd = _.reduce(commands, (a, cmd) => {
    return payload.text.match(cmd.pattern) ? cmd : a
  }, helpCommand)

  cmd.handler(payload, res)
}) */



app.listen(config('PORT'), (err) => {
  if (err) throw err

  console.log(`\n🚀  Starbot LIVES on PORT ${config('PORT')} 🚀`)

  if (config('SLACK_TOKEN')) {
    console.log(`🤖  beep boop: @starbot is real-time\n`)
    bot.listen({ token: config('SLACK_TOKEN') })
  }
})
