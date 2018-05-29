const moment = require("moment");
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

var simpleEncoding =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

// This function scales the submitted values so that
// maxVal becomes the highest value.
function simpleEncode(valueArray, maxValue) {
  var chartData = ["s:"];
  for (var i = 0; i < valueArray.length; i++) {
    var currentValue = valueArray[i];
    if (!isNaN(currentValue) && currentValue >= 0) {
      chartData.push(
        simpleEncoding.charAt(
          Math.round((simpleEncoding.length - 1) * currentValue / maxValue)
        )
      );
    } else {
      chartData.push("_");
    }
  }
  return chartData.join("");
}

// Same as simple encoding, but for extended encoding.
var EXTENDED_MAP =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-.";
var EXTENDED_MAP_LENGTH = EXTENDED_MAP.length;
function extendedEncode(arrVals, maxVal) {
  var chartData = "e:";

  for (i = 0, len = arrVals.length; i < len; i++) {
    // In case the array vals were translated to strings.
    var numericVal = new Number(arrVals[i]);
    // Scale the value to maxVal.
    var scaledVal = Math.floor(
      EXTENDED_MAP_LENGTH * EXTENDED_MAP_LENGTH * numericVal / maxVal
    );

    if (scaledVal > EXTENDED_MAP_LENGTH * EXTENDED_MAP_LENGTH - 1) {
      chartData += "..";
    } else if (scaledVal < 0) {
      chartData += "__";
    } else {
      // Calculate first and second digits and add them to the output.
      var quotient = Math.floor(scaledVal / EXTENDED_MAP_LENGTH);
      var remainder = scaledVal - EXTENDED_MAP_LENGTH * quotient;
      chartData +=
        EXTENDED_MAP.charAt(quotient) + EXTENDED_MAP.charAt(remainder);
    }
  }

  return chartData;
}

exports.helloWorld = functions.https.onRequest((request, response) => {
  response.send("Hello from Firebase!");
});

exports.getCurrentChart = functions.https.onRequest((request, response) => {
  return db
    .collection("marketcap")
    .orderBy("date")
    .get()
    .then(snapshot => {
      const allData = [];
      snapshot.forEach(doc => allData.push(doc.data()));
      const finalData = allData.reduce(
        (currentArray, currentData) => {
          currentArray[0].push(moment(currentData.date).format("M/D/YYYY"));
          const value = ("" + currentData.value).substr(0, 3);
          currentArray[1].push(value);
          return currentArray;
        },
        [[], []]
      );
      const values = extendedEncode(finalData[1], 999);

      return response.send(
        `https://chart.googleapis.com/chart?cht=lc&chd=${values}&chs=800x300&chl=${finalData[0].join(
          "|"
        )}`
      );
    })
    .catch(error => {
      console.error({ error });
      return response
        .status(500)
        .send(`Oopsy looks like we I can't handle this request right now :(`);
    });
});
