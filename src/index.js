
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
const screenshotlayer = require('./helpers/screenshotlayer');
const syncro = require('./helpers/syncro');
var ringcentral = require('./helpers/ringcentral');
const apiUrl = 'https://slack.com/api';
//var async = require("async");
const axios = require('axios');
const qs = require('querystring');
const debug = require('debug')('slash-command-template:index');
const { WebClient } = require('@slack/web-api');
var async = require("async");


// Initialize Slack WebCLient
const web = new WebClient(process.env.SLACK_TOKEN);

// This argument can be a channel ID, a DM ID, a MPDM ID, or a group ID
//
const conversationId = 'CPTHPHCNL'; //#alerts-ticket-dashboard channel




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



/** Matt's slash code 
app.post('/slash', (req, res) => {
  // extract the slash command text, and trigger ID from payload
  const { text, trigger_id } = req.body;

  res.send('');
  console.log("Entered Into Slash Route")

  syncro.getTicket(text).then((result) => {
    //console.log('ticketNumberToID Result')
    console.log('Ticket ID is -> ' + result.data.tickets[0].id)
        
    //Uploads recording to Syncro ticket using ID number and Slack public file URL
    //var promise = syncro.uploadFile(result.data.tickets[0].id, payload.state)
    //return promise;
    console.log('Result is ->')
    console.log(result.data)
    Promise.resolve(result.data)

      // Verify the signing secret
    if (signature.isVerified(req)) {
      console.log("Slack Signature is verified")
      // create the dialog payload - includes the dialog structure, Slack API token,
      // and trigger ID
      const view = {
        token: process.env.SLACK_ACCESS_TOKEN,
        trigger_id,
        dialog: JSON.stringify({          
            ok: true,
            view: { 
              id: "VN4EY482G",
              team_id: "T9M5SK1JMA",
              type: "modal",
              title: { 
                type: "plain_text",
                text: "Just a modal"
              },
              close: {
                type: "plain_text",
                text: "Cancel"
              },
              submit: null,
              blocks: [
             {
                 type: "section",
                 text: {
                     type: "mrkdwn",
                     text: "Is this the correct Ticket?"
                 }
             },
             {
                 type: "divider"
             },
             {
                 type: "section",
                 fields: [
                     {
                         type: "mrkdwn",
                         text: "*Ticket Number:*\n1000"
                     },
                     {
                         type: "mrkdwn",
                         text: "*Title:*\nTechSuite Log Test"
                     },
                     {
                         type: "mrkdwn",
                         text: "*Status:*\nResolved"
                     },
                     {
                         type: "mrkdwn",
                         text: "*Customer:*\nTech in a Flash Computer Services LLC"
                     },
                     {
                         type: "mrkdwn",
                         text: "*Due Date:*\nMar 11 11:28pm"
                     }
                 ]
             },
             {
                 type: "section",
                 text: {
                     type: "mrkdwn",
                     text: "Pick a date for the deadline."
                 },
                 accessory: {
                     type: "datepicker",
                     placeholder: {
                         type: "plain_text",
                         text: "Select a date",
                         emoji: true
                     }
                 }
             },
             {
                 type: "divider"
             },
             {
                 type: "actions",
                 elements: [
                     {
                         type: "button",
                         text: {
                             type: "plain_text",
                             emoji: true,
                             text: "Approve"
                         },
                         style: "primary",
                         value: "Allowed"
                     },
                     {
                         type: "button",
                         text: {
                             type: "plain_text",
                             emoji: true,
                             text: "Deny"
                         },
                         style: "danger",
                         value: "Denied"
                     }
                 ]
             }
          ],
              private_metadata: "",
              callback_id: "modal-identifier",
              state: { "values": {} },
              hash: "1568843014.01d284ba",
              clear_on_close: false,
              notify_on_close: false,
              root_view_id: "VN4EY482G",
              previous_view_id: null,
              app_id: "AXX3321AQ",
              bot_id: "BXXP7AM4A" 
            }
          
        }),
      };

      slack.openView(view).then((result) => {
        if(result.data.error) {
          console.log(result.data);
          res.sendStatus(500);
        } else {
          res.sendStatus(200);
        }
      }).catch((err) => {
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
*/

/* Nate's slash code */
app.post('/slash', (req, res) => {
  // extract the slash command text, and trigger ID from payload
  const { text, trigger_id } = req.body;
  
  syncro.getTicket(text).then((result) => {
    //console.log('ticketNumberToID Result')
    console.log('Ticket ID is -> ' + result.data.tickets[0].id)
        
    //Uploads recording to Syncro ticket using ID number and Slack public file URL
    //var promise = syncro.uploadFile(result.data.tickets[0].id, payload.state)
    //return promise;
    console.log('Result is ->')
    console.log(result.data)
    Promise.resolve(result.data)

      // Verify the signing secret
    if (signature.isVerified(req)) {
      console.log("Slack Signature is verified")
      // create the dialog payload - includes the dialog structure, Slack API token,
      // and trigger ID
      const view = {
        token: process.env.SLACK_ACCESS_TOKEN,
        trigger_id,
        dialog: JSON.stringify({          
            ok: true,
            view: { 
              id: "VN4EY482G",
              team_id: "T9M5SK1JMA",
              type: "modal",
              title: { 
                type: "plain_text",
                text: "Just a modal"
              },
              close: {
                type: "plain_text",
                text: "Cancel"
              },
              submit: null,
              blocks: [
             {
                 type: "section",
                 text: {
                     type: "mrkdwn",
                     text: "Is this the correct Ticket?"
                 }
             },
             {
                 type: "divider"
             },
             {
                 type: "section",
                 fields: [
                     {
                         type: "mrkdwn",
                         text: "*Ticket Number:*\n1000"
                     },
                     {
                         type: "mrkdwn",
                         text: "*Title:*\nTechSuite Log Test"
                     },
                     {
                         type: "mrkdwn",
                         text: "*Status:*\nResolved"
                     },
                     {
                         type: "mrkdwn",
                         text: "*Customer:*\nTech in a Flash Computer Services LLC"
                     },
                     {
                         type: "mrkdwn",
                         text: "*Due Date:*\nMar 11 11:28pm"
                     }
                 ]
             },
             {
                 type: "section",
                 text: {
                     type: "mrkdwn",
                     text: "Pick a date for the deadline."
                 },
                 accessory: {
                     type: "datepicker",
                     placeholder: {
                         type: "plain_text",
                         text: "Select a date",
                         emoji: true
                     }
                 }
             },
             {
                 type: "divider"
             },
             {
                 type: "actions",
                 elements: [
                     {
                         type: "button",
                         text: {
                             type: "plain_text",
                             emoji: true,
                             text: "Approve"
                         },
                         style: "primary",
                         value: "Allowed"
                     },
                     {
                         type: "button",
                         text: {
                             type: "plain_text",
                             emoji: true,
                             text: "Deny"
                         },
                         style: "danger",
                         value: "Denied"
                     }
                 ]
             }
          ]
            }
          
        }),
      };

      slack.openView(view).then((result) => {
        if(result.data.error) {
          console.log(result.data);
          res.sendStatus(500);
        } else {
          res.sendStatus(200);
        }
      }).catch((err) => {
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

//Gets screenshot from ticket dashboard
app.get('/screenshotweb', (req, res) => { 
  screenshotlayer.captureWeb().then((result) => { 
    console.log(result.data) 
    var screenshot = result.data

    
      //uploads screenshot to slack
      const uploadresult = web.files.upload({
        filename: ('TicketDashboard.png'), 
        // You can use a ReadableStream or a Buffer for the file option
        // This file is located in the current directory (`process.pwd()`), so the relative path resolves
        file: screenshot,
        filetype: 'png',
        channels: conversationId,
        initial_comment: ('Ticket Dashboard Screnshot')
      })
    
  }) 
})


app.listen(config('PORT'), (err) => {
  if (err) throw err

  console.log(`\n🚀  Syncrobot LIVES on PORT ${config('PORT')} 🚀`)

  if (config('SLACK_TOKEN')) {
    console.log(`🤖  beep boop: @Syncrobot is real-time\n`)
    bot.listen({ token: config('SLACK_TOKEN') })
  }
})
