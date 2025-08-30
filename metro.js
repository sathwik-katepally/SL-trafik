const Alexa = require('ask-sdk-core');
  const https = require('https');
  // Helper function to make HTTP GET request
  function makeHttpRequest(url) {
      return new Promise((resolve, reject) => {
          https.get(url, (response) => {
              let data = '';
              response.on('data', (chunk) => {
                  data += chunk;
              });
              response.on('end', () => {
                  try {
                      resolve(JSON.parse(data));
                  } catch (error) {
                      reject(error);
                  }
              });
          }).on('error', (error) => {
              reject(error);
          });
      });
  }

 function getNextMetroDepartures(departures, count = 10) {
    if (!departures || departures.length === 0) {
        return [];
    }

    const filtered = departures.filter(dep => {
        const display = dep.display.toLowerCase();

        // Exclude "nu" or anything under 10 minutes
        if (display === 'nu') return false;

        // Extract the number part
        const num = parseInt(display.replace(/[^\d]/g, ''), 10);

        // Exclude if number is less than 10
        return isNaN(num) || num >= 10;
    });

    // Sort the filtered departures
    const sorted = filtered.sort((a, b) => {
        const displayA = a.display.toLowerCase();
        const displayB = b.display.toLowerCase();

        const numA = parseInt(displayA.replace(/[^\d]/g, ''), 10) || 999999;
        const numB = parseInt(displayB.replace(/[^\d]/g, ''), 10) || 999999;

        return numA - numB;
    });

    return sorted.slice(0, count);
}



  const LaunchRequestHandler = {
      canHandle(handlerInput) {
          return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
      },
      handle(handlerInput) {
          const speakOutput = 'Ask me about the next metro departure.';
          return handlerInput.responseBuilder
              .speak(speakOutput)
              .reprompt(speakOutput)
              .getResponse();
      }
  };

  const NextMetroIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'NextMetroIntent';
    },
    async handle(handlerInput) {
        try {
            const apiUrl = 'https://transport.integration.sl.se/v1/sites/3783/departures?transport=METRO&direction=2';
            const apiResponse = await makeHttpRequest(apiUrl);

            const nextMetros = getNextMetroDepartures(apiResponse.departures, 5); // get top 5

            if (nextMetros.length === 0) {
                const speakOutput = 'Sorry, I could not find any metro departures at the moment.';
                return handlerInput.responseBuilder
                    .speak(speakOutput)
                    .getResponse();
            }

            const phrases = nextMetros.map(metro => {
                const line = metro.line.designation;
                const destination = metro.destination;
                const time = metro.display.toLowerCase();
                const onlyTimeNumber = parseInt(time, 10)

                let timePhrase;
                if (onlyTimeNumber >= 10) {
                    timePhrase = `in ${time}`;
                }

                return `line ${line} to ${destination}, departing ${timePhrase}`;
            });

            const speakOutput = `Here are the next metros: ${phrases.join(', and ')}.`;

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .getResponse();

        } catch (error) {
            console.error('Error fetching metro data:', error);
            const speakOutput = 'Sorry, I had trouble getting the metro information. Please try again later.';
            return handlerInput.responseBuilder
                .speak(speakOutput)
                .getResponse();
        }
    }
};

  const HelpIntentHandler = {
      canHandle(handlerInput) {
          return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
              && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
      },
      handle(handlerInput) {
          const speakOutput = 'You can ask me about the next metro departure by saying "what is the next metro" or "when is the next metro".';
          return handlerInput.responseBuilder
              .speak(speakOutput)
              .reprompt(speakOutput)
              .getResponse();
      }
  };

  const CancelAndStopIntentHandler = {
      canHandle(handlerInput) {
          return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
              && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                  || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
      },
      handle(handlerInput) {
          const speakOutput = 'Goodbye!';
          return handlerInput.responseBuilder
              .speak(speakOutput)
              .getResponse();
      }
  };

  const SessionEndedRequestHandler = {
      canHandle(handlerInput) {
          return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
      },
      handle(handlerInput) {
          console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
          return handlerInput.responseBuilder.getResponse();
      }
  };

  const ErrorHandler = {
      canHandle() {
          return true;
      },
      handle(handlerInput, error) {
          console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);
          const speakOutput = 'Sorry, I had trouble doing what you asked. Please try again.';
          return handlerInput.responseBuilder
              .speak(speakOutput)
              .reprompt(speakOutput)
              .getResponse();
      }
  };

  exports.handler = Alexa.SkillBuilders.custom()
      .addRequestHandlers(
          LaunchRequestHandler,
          NextMetroIntentHandler,
          HelpIntentHandler,
          CancelAndStopIntentHandler,
          SessionEndedRequestHandler)
      .addErrorHandlers(ErrorHandler)
      .lambda();
