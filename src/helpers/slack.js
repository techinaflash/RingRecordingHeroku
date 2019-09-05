'use strict';

const axios = require('axios');
const qs = require('qs');

const apiUrl = 'https://slack.com/api';

/*
 *  Get user info from users.info method
 */

//BEGIN OPEN DIALOG
// open the dialog by calling dialogs.open method and sending the payload
const openDialog = (payload, real_name) => {

    const dialogData = {
      token: process.env.SLACK_ACCESS_TOKEN,
      state: payload.message_ts,
      trigger_id: payload.trigger_id,
      dialog: JSON.stringify({
        title: 'Upload file to Syncro',
        callback_id: 'upload_to_syncro',
        submit_label: 'Upload',
        elements: [
           {
             label: 'Ticket Private Comment',
             type: 'textarea',
             name: 'comment',
             value: payload.message.text
           },
           {
             label: 'Attach to Ticket #',
             type: 'text',
             name: 'ticket',
             value: ``,
             placeholder: 'Enter a ticket number...'

           },
           
        ]
      })
    };
  
    // open the dialog by calling dialogs.open method and sending the payload
    const promise = axios.post(`${apiUrl}/dialog.open`, qs.stringify(dialogData));
    return promise;
  };
  //END OPEN DIALOG


  //BEGIN POST EPHEMERAL
  const postEphemeral = (payload, real_name) => {

    const ephemeralData = {
      token: process.env.SLACK_ACCESS_TOKEN,
      trigger_id: payload.trigger_id,
      channel: payload.channel.id,
      text: 'File uploaded to ticket' + payload.submission.ticket,
      thread_ts: payload.state,
      user: payload.user.id,
      attachments: JSON.stringify({
        title: 'Upload file to Syncro',
        callback_id: 'upload_to_syncro',
        submit_label: 'Upload',
        elements: [
           {
             label: 'Ticket Private Comment',
             type: 'textarea',
             name: 'comment',
             value: payload.message.text
           },
           {
             label: 'Attach to Ticket #',
             type: 'text',
             name: 'ticket',
             value: ``,
             placeholder: 'Enter a ticket number...'

           },
           
        ]
      })
    };
  
    // open the dialog by calling dialogs.open method and sending the payload
    const promise = axios.post(`${apiUrl}/chap.postEphemeral`, qs.stringify(dialogData));
    return promise;
  };
  //END POST EPHEMERAL

module.exports = { openDialog, postEphemeral };