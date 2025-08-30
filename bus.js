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

 function getNextBusDepartures(departures, count = 10) {
    if (!departures || departures.length === 0) {
        return [];
    }

    // Sort the departures
    const sorted = departures.sort((a, b) => {
        const displayA = a.display.toLowerCase();
        const displayB = b.display.toLowerCase();

        if (displayA === 'nu') return -1;
        if (displayB === 'nu') return 1;

        const numA = parseInt(displayA.replace(/[^\d]/g, '')) || 999999;
        const numB = parseInt(displayB.replace(/[^\d]/g, '')) || 999999;

        return numA - numB;
    });

    return sorted.slice(0, count);
}


  const LaunchRequestHandler = {
      canHandle(handlerInput) {
          return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
      },
      handle(handlerInput) {
          const speakOutput = 'Welcome to SL Bus Info! Ask me about the next bus departure.';
          return handlerInput.responseBuilder
              .speak(speakOutput)
              .reprompt(speakOutput)
              .getResponse();
      }
  };

  const NextBusIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'NextBusIntent';
    },
    async handle(handlerInput) {
        try {
            const apiUrl = 'https://transport.integration.sl.se/v1/sites/3787/departures?transport=BUS';
            const apiResponse = await makeHttpRequest(apiUrl);

            const nextBuses = getNextBusDepartures(apiResponse.departures, 5); // get top 5

            if (nextBuses.length === 0) {
                const speakOutput = 'Sorry, I could not find any bus departures at the moment.';
                return handlerInput.responseBuilder
                    .speak(speakOutput)
                    .getResponse();
            }

            const phrases = nextBuses.map(bus => {
                const line = bus.line.designation;
                const destination = bus.destination;
                const time = bus.display.toLowerCase();

                let timePhrase;
                if (time === 'nu') {
                    timePhrase = 'now';
                } else if (time.includes('min')) {
                    timePhrase = `in ${time}`;
                } else {
                    timePhrase = `at ${time}`;
                }

                return `line ${line} to ${destination}, departing ${timePhrase}`;
            });

            const speakOutput = `Here are the next buses: ${phrases.join(', and ')}.`;

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .getResponse();

        } catch (error) {
            console.error('Error fetching bus data:', error);
            const speakOutput = 'Sorry, I had trouble getting the bus information. Please try again later.';
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
          const speakOutput = 'You can ask me about the next bus departure by saying "what is the next bus" or "when is the next bus".';
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
          NextBusIntentHandler,
          HelpIntentHandler,
          CancelAndStopIntentHandler,
          SessionEndedRequestHandler)
      .addErrorHandlers(ErrorHandler)
      .lambda();
