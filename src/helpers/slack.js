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
      trigger_id: payload.trigger_id,
      dialog: JSON.stringify({
        title: 'Upload file to Syncro',
        callback_id: 'upload_to_syncro',
        submit_label: 'SyncroUpload',
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
             value: `123456`
           },
           
        ]
      })
    };
  
    // open the dialog by calling dialogs.open method and sending the payload
    const promise = axios.post(`${apiUrl}/dialog.open`, qs.stringify(dialogData));
    return promise;
  };
  //END OPEN DIALOG

module.exports = { openDialog };