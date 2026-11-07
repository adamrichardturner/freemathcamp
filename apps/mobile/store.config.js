// EAS Metadata reads this file (see eas.json → submit.production.ios.metadataPath).
// The listing lives in store.config.json; the App Review demo account's password
// is kept on the server (APP_REVIEW_PASSWORD) and passed in when pushing, never committed.
const config = require("./store.config.json");

const { APP_REVIEW_EMAIL, APP_REVIEW_PASSWORD, APP_REVIEW_PHONE } = process.env;
const review = { ...config.apple.review };
if (APP_REVIEW_EMAIL && APP_REVIEW_PASSWORD) Object.assign(review, { demoUsername: APP_REVIEW_EMAIL, demoPassword: APP_REVIEW_PASSWORD });
if (APP_REVIEW_PHONE) review.phone = APP_REVIEW_PHONE;

module.exports = { ...config, apple: { ...config.apple, review } };
