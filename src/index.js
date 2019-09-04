
'use strict'

const express = require('express')
const proxy = require('express-http-proxy')
const bodyParser = require('body-parser')
const axios = require('axios');
const qs = require('qs');
const _ = require('lodash')
const config = require('./config')
const commands = require('./commands')
const helpCommand = require('./commands/help')
const users = require('./helpers/users');
const confirmation = require('./helpers/confirmation');
const exportNote = require('./helpers/exportNote');

const signature = require('./helpers/verifySignature');

let bot = require('./bot')

let app = express()

if (config('PROXY_URI')) {
  app.use(proxy(config('PROXY_URI'), {
    forwardPath: (req, res) => { return require('url').parse(req.url).path }
  }))
}

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.get('/', (req, res) => { res.send('\n 👋 🌍 \n') })

app.post('/slack/events', (req, res) => {
  //console.log(req)
  const payload = JSON.parse(req.body.payload);
  console.log('******************PAYLOAD START*************************')
  console.log(payload)
  console.log('******************PAYLOAD END*************************')
  const {type, user, message} = payload;
  

  if(type === 'message_action') {
    // Get user info of the person who posted the original message from the payload
    const getUserInfo = new Promise((resolve, reject) => {
      users.find(payload.message.user).then((result) => {
        resolve(result.data.user.profile.real_name);
      }).catch((err) => { reject(err); });
    });

    /*
    if (!signature.isVerified(req)) {
      console.log('Signature is not Verified');
      //res.sendStatus(404);
      //return;
    }*/

    // Once successfully get the user info, open a dialog with the info
    getUserInfo.then((userInfoResult) => {
      openDialog(payload, userInfoResult).then((result) => {
        if(result.data.error) {
          console.log(result.data);
          res.sendStatus(500);
        } else {
          res.sendStatus(200);
        }
      }).catch((err) => {
        res.sendStatus(500);
      });

    })
    .catch((err) => { console.error(err); });

  } else if (type === 'dialog_submission') {
    // immediately respond with a empty 200 response to let
    // Slack know the command was received
    res.send('');
    // create a ClipIt and prepare to export it to the theoritical external app
    exportNote.exportToJson(user.id, message);
    // DM the user a confirmation message
    confirmation.sendConfirmation(user.id, message);
  }
});

app.post('/commands/starbot', (req, res) => {
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
})

//BEGIN OPEN DIALOG
// open the dialog by calling dialogs.open method and sending the payload
const openDialog = (payload, real_name) => {

  const dialogData = {
    token: process.env.SLACK_ACCESS_TOKEN,
    trigger_id: payload.trigger_id,
    dialog: JSON.stringify({
      title: 'Upload file to Syncro',
      callback_id: 'upload_to_syncro',
      submit_label: 'SyncroUpload',
      elements: [
         {
           label: 'Message Text',
           type: 'textarea',
           name: 'message',
           value: payload.message.text
         },
         {
           label: 'Posted by',
           type: 'text',
           name: 'send_by',
           value: `${real_name}`
         },
         {
           label: 'Importance',
           type: 'select',
           name: 'importance',
           value: 'Medium 💎',
           options: [
             { label: 'High', value: 'High 💎💎✨' },
             { label: 'Medium', value: 'Medium 💎' },
             { label: 'Low', value: 'Low ⚪️' }
           ],
         },
      ]
    })
  };

  // open the dialog by calling dialogs.open method and sending the payload
  const promise = axios.post(`${apiUrl}/dialog.open`, qs.stringify(dialogData));
  return promise;
};
//END OPEN DIALOG

app.listen(config('PORT'), (err) => {
  if (err) throw err

  console.log(`\n🚀  Starbot LIVES on PORT ${config('PORT')} 🚀`)

  if (config('SLACK_TOKEN')) {
    console.log(`🤖  beep boop: @starbot is real-time\n`)
    bot.listen({ token: config('SLACK_TOKEN') })
  }
})
