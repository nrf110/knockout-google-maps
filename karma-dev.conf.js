var sharedConfig = require('./karma-shared.conf');

module.exports = function(config) {
  sharedConfig(config);

  config.set({

    plugins: [
        'karma-mocha',
        'karma-phantomjs-launcher',
        'karma-expect',
        'karma-growl-reporter'
    ],

    // test results reporter to use
    // possible values: 'dots', 'progress', 'junit', 'growl', 'coverage'
    reporters: ['dots', 'growl']
  });
};
