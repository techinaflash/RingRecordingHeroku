'use strict';

const axios = require('axios');
const qs = require('qs');

const apiUrl = 'https://supportit.syncromsp.com/api/v1';

const callerID = (payload, direction) => {
    if(direction === 'Inbound'){
        var outbound = false
    }else{
        var outbound = true
    }

    axios.get('https://supportit.syncromsp.com/api/callerid/', {
            params: {
              did:  usersList[i].callerid,
              token: process.env.SYNCRO_CALLERID_TOKEN
            }
          })
          .catch(function (error) {
            console.log(error);
          }); 
  }
module.exports = {  };