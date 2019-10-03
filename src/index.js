
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
const signature = require('./helpers/verifySignature');
const slack = require('./helpers/slack');
const syncro = require('./helpers/syncro');
var ringcentral = require('./helpers/ringcentral');
const apiUrl = 'https://slack.com/api';
//var async = require("async");
const axios = require('axios');
const qs = require('querystring');
const debug = require('debug')('slash-command-template:index');



let bot = require('./bot')

let app = express()

if (config('PROXY_URI')) {
  app.use(proxy(config('PROXY_URI'), {
    forwardPath: (req, res) => { return require('url').parse(req.url).path }
  }))
}

/*
 * Parse application/x-www-form-urlencoded && application/json
 * Use body-parser's `verify` callback to export a parsed raw body
 * that you need to use to verify the signature
 */

const rawBodyBuffer = (req, res, buf, encoding) => {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || 'utf8');
  }
};

app.use(bodyParser.urlencoded({verify: rawBodyBuffer, extended: true }));
app.use(bodyParser.json({ verify: rawBodyBuffer }));

//app.use(bodyParser.json())
//app.use(bodyParser.urlencoded({ extended: true }))

//Main Route
app.get('/', (req, res) => { res.sendFile('./src/index.html') })

//Test Route
app.get('/test', (req, res) => {
  console.log('Starting Test')
  const test = slack.postMessage();
  console.log(test)
})

//********************************************************
//Slack Message Actions and Events Route           BEGIN
//******************************************************* */
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
      
        //Convert submitted ticket number to ticket ID in Syncro
        syncro.ticketNumberToID(submission.ticket).then((result) => {
          //console.log('ticketNumberToID Result')
          console.log('Ticket ID is -> ' + result.data.tickets[0].id)
          console.log('State from dialog is -> ' + payload.state)
          
          //Uploads recording to Syncro ticket using ID number and Slack public file URL
          var promise = syncro.uploadFile(result.data.tickets[0].id, payload.state)
          return promise;
          
          //syncro.commentTicket(submission.ticket, userInfoResult, submission.comment)
        }).then((result) => {
          console.log('Result is ->')
          console.log(result.data)
          
          //Creates a comment on Syncro ticket using the note put into the Slack dialog
          var promise = syncro.commentTicket(submission.ticket, userInfoResult, submission.comment)
          return promise;
          //syncro.uploadFile(result, 'https://files.slack.com/files-pri/T04P48F8P-FN5TGAQTA/matthew_rebstock_inbound_2019-09-09t17-50-53.360z.mp3?pub_secret=d14e5dc30f')
          //syncro.uploadFile(result, payload.state)
        }).then((result) => {
          console.log('Result is ->')
          console.log(result.data)
          
          //Posts an Ephermal message in slack (emphemeral is only visible to the user.)
          slack.postEphemeral(payload)
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
//********************************************************
//Slack Message Actions and Events Route           END
//******************************************************* */



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

app.post('/slash', (req, res) => {
  // extract the slash command text, and trigger ID from payload
  const { text, trigger_id } = req.body;

  res.send('');
  console.log("Entered Into Slash Route")

  syncro.getTicket(text).then((result) => {
    //console.log('ticketNumberToID Result')
    console.log('Ticket ID is -> ' + result.data.tickets[0].id)
    console.log('State from dialog is -> ' + payload.state)
    
    //Uploads recording to Syncro ticket using ID number and Slack public file URL
    //var promise = syncro.uploadFile(result.data.tickets[0].id, payload.state)
    //return promise;
    console.log('Result is ->')
    console.log(result.data)

      // Verify the signing secret
  if (signature.isVerified(req)) {
    console.log("Slack Signature is verified")
    // create the dialog payload - includes the dialog structure, Slack API token,
    // and trigger ID
    const dialog = {
      token: process.env.SLACK_ACCESS_TOKEN,
      trigger_id,
      dialog: JSON.stringify({
        title: 'Postpone a Ticket',
        callback_id: 'postpone-ticket',
        submit_label: 'Submit',
        elements: [
          {
            label: 'Title',
            type: 'text',
            name: 'title',
            value: text,
            hint: '30 second summary of the problem',
          },
          {
            label: 'Description',
            type: 'textarea',
            name: 'description',
            optional: true,
          },
          {
            label: 'Urgency',
            type: 'select',
            name: 'urgency',
            options: [
              { label: 'Low', value: 'Low' },
              { label: 'Medium', value: 'Medium' },
              { label: 'High', value: 'High' },
            ],
          },
          {
            accessory: {
              type: "datepicker",
              initial_date: "1990-04-28",
              placeholder: {
                type: "plain_text",
                text: "Select a date",
                emoji: true
              }
            }
          }
        ],
      }),
    };

    // open the dialog by calling dialogs.open method and sending the payload
    axios.post(`${apiUrl}/dialog.open`, qs.stringify(dialog))
      .then((result) => {
        debug('dialog.open: %o', result.data);
        res.send('');
      }).catch((err) => {
        debug('dialog.open call failed: %o', err);
        res.sendStatus(500);
      });
  } else {
    debug('Verification token mismatch');
    res.sendStatus(404);
  }
    //syncro.commentTicket(submission.ticket, userInfoResult, submission.comment)

  }).catch((err) => {
    console.log('*****************Error**********************')
    console.log(err)
  });

  

});


app.listen(config('PORT'), (err) => {
  if (err) throw err

  console.log(`\n🚀  Syncrobot LIVES on PORT ${config('PORT')} 🚀`)

  if (config('SLACK_TOKEN')) {
    console.log(`🤖  beep boop: @Syncrobot is real-time\n`)
    bot.listen({ token: config('SLACK_TOKEN') })
  }
})
