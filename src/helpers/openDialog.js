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

module.exports = { openDialog };
