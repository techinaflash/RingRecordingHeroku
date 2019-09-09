'use strict';

const axios = require('axios');
const qs = require('qs');

const api_key = process.env.SYNCRO_API_KEY
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

  function commentTicket (ticketNumber, tech, comment){
    axios.post('https://supportit.syncromsp.com/api/v1/tickets/' + ticketNumber + '/comment', {
      params: {
        api_key: api_key,
        hidden: '1',
        do_not_email: '1',
        body: comment,
        //tech: tech,
        subject: 'Call Recording Log'
      }
    })
    .then(function (result) {
      console.log('**************************Result of commentTicket ->' + result)
      return result[0]
    })
    .catch(function (error) {
      console.log(error);
    }); 


  }

  function uploadFile (ticketNumber, url){
    axios.post('https://supportit.syncromsp.com/api/v1/tickets/' + ticketNumber + '/attach_file_url', {
      params: {
        api_key: api_key,
        url: url
      }
    })
    .then(function (result) {
      console.log('**************************Result of uploadFile ->' + JSON.parse(result))
      return result
    })
    .catch(function (error) {
      console.log(error);
    }); 


  }

  function ticketNumberToID(ticketNumber){
    console.log('Convert Ticket number ->' + ticketNumber)
     /* const requestData = {
      api_key: api_key,
      number: ticketNumber
     } */
    
   

    const promise = axios.get('https://supportit.syncromsp.com/api/v1/tickets/', {
      params: {
        api_key: api_key,
        number: ticketNumber
      }
    });
    return promise;
  
  }

module.exports = { commentTicket, uploadFile, ticketNumberToID };