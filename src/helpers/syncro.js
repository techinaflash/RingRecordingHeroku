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
    const parameters = {
      api_key: api_key,
        hidden: '1',
        do_not_email: '1',
        body: comment,
        tech: tech,
        subject: 'Call Recording Log'
    } 
    var promise = axios.post(apiUrl + '/tickets/' + ticketNumber + '/comment', parameters)
    .catch(function (error) {
      console.log(error);
    }); 
    return promise;

  }

  function uploadFile (ticketID, downloadUrl){
    //console.log()
    const parameters = {
      api_key: api_key,
      url: downloadUrl
    } 
    var promise = axios.post(apiUrl + '/tickets/' + ticketID + '/attach_file_url', parameters)
    .catch(function (error) {
      console.log(error);
    }); 
    return promise;

  }

  function ticketNumberToID(ticketNumber){
    console.log('Convert Ticket number ->' + ticketNumber)
     /* const requestData = {
      api_key: api_key,
      number: ticketNumber
     } */
    const promise = axios.get(apiUrl + '/tickets/', {
      params: {
        api_key: api_key,
        number: ticketNumber
      }
    });
    return promise;
  
  }

  function getTicket(ticketNumber){
    
     /* const requestData = {
      api_key: api_key,
      number: ticketNumber
     } */
    const promise = axios.get(apiUrl + '/tickets/', {
      params: {
        api_key: api_key,
        number: ticketNumber
      }
    });
    return promise;
  
  }

  function callerid (phoneNumber, outboundTrue){
    //console.log('****************************RUNNING SYNCRO CALLER ID API*************************************')
    //console.log('Phone Number:' + phoneNumber)
    //console.log('Outbound = ' + outboundTrue)
    const parameters = {
      params : {
        did: phoneNumber,
        token: process.env.SYNCRO_CALLERID_TOKEN
      }
    } 
    if (outboundTrue == true){
      parameters.params['outbound'] = true
    }
    
    axios.get('https://supportit.syncromsp.com/api/callerid/', parameters )
    .then(function (response) {
      console.log(response)
    })
    .catch(function (error) {
      console.log(error);
    }); 

  }

module.exports = { commentTicket, uploadFile, ticketNumberToID, getTicket, callerid };